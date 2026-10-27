/**
 * checkTopicSubscription
 *
 * 轮询所有 pending 状态的话题订阅订单：
 *   1. 超时的订单 → 标记 timeout
 *   2. 未超时的订单 → 用 getUSDTTransfers 查收款地址入账
 *      匹配到 txHash 且金额 >= 应付金额 → paid + 续期 + 通知 owner
 *
 * 运行时机：bidirection-subscription 进程每 5 分钟触发。
 */

import Bot from '../models/bot';
import Subscription from '../models/subscription';
import { getUSDTTransfers } from './checkUsdt';
import { setupBot } from '../bot/botSetup';
import createDebug from 'debug';

const debug = createDebug('cron:checkTopicSubscription');

export async function checkTopicSubscription(): Promise<void> {
  debug('[checkTopicSubscription] 开始轮询 pending 订单...');

  const now = new Date();

  // ── 1. 将已超时的 pending 订单标记为 timeout ─────────────────
  const timeoutResult = await Subscription.updateMany(
    { status: 'pending', orderExpiredAt: { $lte: now } },
    { $set: { status: 'timeout' } },
  );
  if (timeoutResult.modifiedCount > 0) {
    debug(
      `[checkTopicSubscription] ${timeoutResult.modifiedCount} 个订单已超时`,
    );
  }

  // ── 2. 取所有仍在有效期内的 pending 订单 ─────────────────────
  const pendingOrders = await Subscription.find({
    status: 'pending',
    orderExpiredAt: { $gt: now },
  })
    .populate({
      path: 'bot',
      select: 'botName token owner topicSubscriptionExpiredAt user',
      populate: [
        { path: 'owner', select: 'id' },
        { path: 'user', select: 'trx20_address subscriptionPlans' },
      ],
    })
    .lean();

  debug(
    `[checkTopicSubscription] ${pendingOrders.length} 个 pending 订单待检查`,
  );

  for (const order of pendingOrders) {
    try {
      await processOrder(order);
    } catch (err: any) {
      debug(`订单 ${order._id} 处理失败:`, err?.message || err);
    }
  }

  // ── 3. 兜底：扫描 2 小时内刚超时的 timeout 订单 ──────────────
  // 用户可能在订单超时前几秒才转账，链上确认时已被标为 timeout，
  // 需要在超时后继续扫描一段时间，确保不漏单。
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const recentTimeoutOrders = await Subscription.find({
    status: 'timeout',
    orderExpiredAt: { $gt: twoHoursAgo, $lte: now },
  })
    .populate({
      path: 'bot',
      select: 'botName token owner topicSubscriptionExpiredAt user',
      populate: [
        { path: 'owner', select: 'id' },
        { path: 'user', select: 'trx20_address subscriptionPlans' },
      ],
    })
    .lean();

  debug(
    `[checkTopicSubscription] ${recentTimeoutOrders.length} 个 timeout 订单进行兜底检查`,
  );

  for (const order of recentTimeoutOrders) {
    try {
      await processOrder(order, true);
    } catch (err: any) {
      debug(`timeout 订单 ${order._id} 兜底处理失败:`, err?.message || err);
    }
  }

  debug('[checkTopicSubscription] 完成');
}

async function processOrder(order: any, isRecovery = false): Promise<void> {
  const bot = order.bot;
  if (!bot) return;

  // toAddress 在创建订单时已快照，直接用
  const toAddress: string = order.toAddress;
  if (!toAddress) return;

  const requiredAmount: number = order.amount;

  // 兜底模式：查询窗口扩展到订单创建时间前后共 3 小时，确保不漏链上慢确认的交易
  const queryMinutes = isRecovery ? 180 : undefined;

  // 查询收款地址的 USDT 入账
  const transfers = await getUSDTTransfers(toAddress, queryMinutes);

  for (const transfer of transfers) {
    // 只处理入账方向
    if (transfer.to_address.toLowerCase() !== toAddress.toLowerCase()) continue;

    // 金额精确匹配（允许 ±0.005 浮点误差）
    if (Math.abs(transfer.money - requiredAmount) > 0.005) continue;

    // 转账时间必须在订单创建之后（order.createdAt 单位秒）
    const orderCreatedAt = new Date(order.createdAt).getTime() / 1000;
    if (transfer.time < orderCreatedAt) continue;

    // 防止同一笔 txHash 被多个订单认领（全局唯一）
    const alreadyClaimed = await Subscription.exists({
      txHash: transfer.trade_id,
    });
    if (alreadyClaimed) continue;

    // ── 确认到账：更新订单 ────────────────────────────────────
    const now = new Date();
    const currentExpiry =
      bot.topicSubscriptionExpiredAt &&
      new Date(bot.topicSubscriptionExpiredAt) > now
        ? new Date(bot.topicSubscriptionExpiredAt)
        : now;

    const newExpiry = new Date(currentExpiry);
    // 兼容旧订单（months字段）和新订单（days字段）
    const daysToAdd = order.days ?? (order.months ? order.months * 30 : 30);
    newExpiry.setDate(newExpiry.getDate() + daysToAdd);

    await Subscription.findByIdAndUpdate(order._id, {
      status: 'paid',
      txHash: transfer.trade_id,
      fromAddress: transfer.from_address,
      paidAmount: transfer.money,
      paidAt: now,
      startDate: currentExpiry,
      endDate: newExpiry,
    });

    // 更新 bot 到期时间
    await Bot.findByIdAndUpdate(bot._id, {
      topicSubscriptionExpiredAt: newExpiry,
    });

    if (isRecovery) {
      debug(
        `[checkTopicSubscription] 兜底恢复：timeout 订单 ${
          order._id
        } 已识别到账，bot ${bot.botName} 续期至 ${newExpiry.toLocaleString()}`,
      );
    } else {
      debug(
        `[checkTopicSubscription] 订单 ${order._id} 已付款，bot ${
          bot.botName
        } 续期至 ${newExpiry.toLocaleString()}`,
      );
    }

    // 通知 owner（owner 已 populate，直接取 id）
    await notifyOwner(bot, transfer.money, newExpiry, isRecovery);

    break; // 一笔 txHash 只匹配一个订单
  }
}

async function notifyOwner(
  bot: any,
  amount: number,
  expiry: Date,
  isRecovery = false,
): Promise<void> {
  try {
    const ownerId = bot.owner?.id;
    if (!ownerId) return;

    const botInstance = setupBot(bot.token);

    const recoveryNote = isRecovery
      ? `\n⚠️ 您的付款在订单超时后被系统识别，已自动补录并激活。\n`
      : '';

    await botInstance.api.sendMessage(
      ownerId,
      `✅ <b>话题双向通信</b> 续费成功！\n\n` +
        `金额：<b>${amount} USDT</b>\n` +
        `服务有效期至：<b>${expiry.toLocaleString('zh-CN', {
          hour12: false,
        })}</b>\n` +
        recoveryNote +
        `\n感谢您的使用，到期前我们会提前提醒您续费。`,
      { parse_mode: 'HTML' },
    );
  } catch (err: any) {
    debug('通知 owner 失败:', err?.message || err);
  }
}
