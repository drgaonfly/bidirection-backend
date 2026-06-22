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
import User from '../models/user';
import { getUSDTTransfers } from './checkUsdt';
import { setupBot } from '../bot/botSetup';
import createDebug from 'debug';

const debug = createDebug('cron:checkTopicSubscription');

const SUBSCRIPTION_DAYS = 30;

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
        { path: 'user', select: 'trx20_address topicSubscriptionMonthlyFee' },
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

  debug('[checkTopicSubscription] 完成');
}

async function processOrder(order: any): Promise<void> {
  const bot = order.bot;
  if (!bot) return;

  // toAddress 在创建订单时已快照，直接用
  const toAddress: string = order.toAddress;
  if (!toAddress) return;

  const requiredAmount: number = order.amount;

  // 查询收款地址最近 15 分钟的 USDT 入账（默认窗口）
  const transfers = await getUSDTTransfers(toAddress);

  for (const transfer of transfers) {
    // 只处理入账方向
    if (transfer.to_address.toLowerCase() !== toAddress.toLowerCase()) continue;

    // 金额精确匹配（允许 ±0.005 浮点误差）
    if (Math.abs(transfer.money - requiredAmount) > 0.005) continue;

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
    newExpiry.setDate(newExpiry.getDate() + SUBSCRIPTION_DAYS);

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

    debug(
      `[checkTopicSubscription] 订单 ${order._id} 已付款，bot ${
        bot.botName
      } 续期至 ${newExpiry.toLocaleString()}`,
    );

    // 通知 owner（owner 已 populate，直接取 id）
    await notifyOwner(bot, transfer.money, newExpiry);

    break; // 一笔 txHash 只匹配一个订单
  }
}

async function notifyOwner(
  bot: any,
  amount: number,
  expiry: Date,
): Promise<void> {
  try {
    const ownerId = bot.owner?.id;
    if (!ownerId) return;

    const botInstance = setupBot(bot.token);
    await botInstance.api.sendMessage(
      ownerId,
      `✅ <b>话题双向通信</b> 续费成功！\n\n` +
        `金额：<b>${amount} USDT</b>\n` +
        `服务有效期至：<b>${expiry.toLocaleString('zh-CN', {
          hour12: false,
        })}</b>\n\n` +
        `感谢您的使用，到期前我们会提前提醒您续费。`,
      { parse_mode: 'HTML' },
    );
  } catch (err: any) {
    debug('通知 owner 失败:', err?.message || err);
  }
}
