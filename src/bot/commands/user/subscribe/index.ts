/**
 * /subscribe 命令
 *
 * 仅 owner 私聊可用。流程：
 *   /subscribe
 *     → 展示当前订阅状态卡片（状态 + 有效期 + 近期记录）
 *     → 点「发起续费」→ 创建 pending 订单（15 分钟内有效）→ 展示付款地址 + 金额
 *     → cron 每 5 分钟轮询 pending 订单，确认到账后自动激活
 *     → 点「刷新状态」→ 实时查看是否已到账
 */

import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import Subscription from '../../../../models/subscription';
import BotUser from '../../../../models/botUser';
import createDebug from 'debug';

const debug = createDebug('bot:subscribe');
const subscribeComposer = new Composer<MyContext>();

/** pending 订单有效期（分钟） */
const ORDER_TIMEOUT_MINUTES = 60;

// ── /subscribe 命令入口 ──────────────────────────────────────
subscribeComposer.command('subscribe', async (ctx) => {
  if (ctx.chat?.type !== 'private') return;
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isOwner(ctx))) {
    await ctx.reply('❌ 只有机器人拥有者才能管理订阅。');
    return;
  }
  await sendStatusCard(ctx);
});

// ── callback: subscribe_refresh — 刷新状态卡片 ──────────────
subscribeComposer.callbackQuery('subscribe_refresh', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isOwner(ctx))) return;
  await sendStatusCard(ctx, true);
});

// ── callback: subscribe_pay — 发起续费，创建 pending 订单 ────
subscribeComposer.callbackQuery('subscribe_pay', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isOwner(ctx))) return;

  const bot = await Bot.findById(ctx.currentBot._id)
    .select('botName topicSubscriptionExpiredAt activeTopicGroup')
    .lean();

  if (!bot) return;

  const fee: number = ctx.currentProxyUser?.topicSubscriptionMonthlyFee ?? 25;
  const toAddress: string = ctx.currentProxyUser?.trx20_address || '';

  if (!toAddress) {
    await ctx.reply('❌ 收款地址未配置，请联系管理员设置 trx20 地址后再续费。');
    return;
  }

  // 若已有 pending 订单（未超时），直接展示，不重复创建
  const existing = await Subscription.findOne({
    bot: bot._id,
    status: 'pending',
    orderExpiredAt: { $gt: new Date() },
  }).lean();

  const order = existing ?? (await createPendingOrder(bot, fee, toAddress));

  await sendPaymentCard(ctx, order, toAddress, true);
});

// ── callback: subscribe_check — 手动查单（轮询中间状态提示）─
subscribeComposer.callbackQuery('subscribe_check', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await isOwner(ctx))) return;

  const pendingOrder = await Subscription.findOne({
    bot: ctx.currentBot._id,
    status: 'pending',
    orderExpiredAt: { $gt: new Date() },
  }).lean();

  if (!pendingOrder) {
    // 没有 pending 说明可能已付款，刷新状态卡片
    await sendStatusCard(ctx, true);
    return;
  }

  // 还是 pending，刷新付款卡片（保留倒计时感）
  const toAddr = ctx.currentProxyUser?.trx20_address ?? '';
  await sendPaymentCard(ctx, pendingOrder, toAddr, true);
});

// ────────────────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────────────────

async function createPendingOrder(
  bot: any,
  fee: number,
  toAddress: string,
): Promise<any> {
  const orderExpiredAt = new Date();
  orderExpiredAt.setMinutes(
    orderExpiredAt.getMinutes() + ORDER_TIMEOUT_MINUTES,
  );

  // 生成唯一尾数（0.01 ~ 0.99），用于精确匹配链上转账金额
  const tail = Math.floor(Math.random() * 99 + 1) / 100;
  const uniqueAmount = Math.round((fee + tail) * 100) / 100;

  return Subscription.create({
    bot: bot._id,
    amount: uniqueAmount,
    toAddress,
    orderExpiredAt,
    status: 'pending',
  });
}

/** 展示订阅状态总览卡片 */
async function sendStatusCard(ctx: MyContext, edit = false): Promise<void> {
  const bot = await Bot.findById(ctx.currentBot._id)
    .select('topicSubscriptionExpiredAt activeTopicGroup botName')
    .lean();

  if (!bot) return;

  const now = new Date();
  const expiry = bot.topicSubscriptionExpiredAt
    ? new Date(bot.topicSubscriptionExpiredAt)
    : null;
  const isActive = !!expiry && expiry > now;
  const fee = ctx.currentProxyUser?.topicSubscriptionMonthlyFee ?? 25;

  // 最近 3 条已付款记录
  const recentPaid = await Subscription.find({
    bot: bot._id,
    status: 'paid',
  })
    .sort({ paidAt: -1 })
    .limit(3)
    .lean();

  const statusLine = isActive
    ? `✅ <b>服务状态：</b>正常\n📅 <b>有效期至：</b>${expiry!.toLocaleString(
        'zh-CN',
        { hour12: false },
      )}`
    : `❌ <b>服务状态：</b>已到期或未开通`;

  const historyLines =
    recentPaid.length > 0
      ? recentPaid
          .map(
            (s) =>
              `  • ${s.paidAmount ?? s.amount} USDT — 至 ${new Date(
                s.endDate!,
              ).toLocaleDateString('zh-CN')}`,
          )
          .join('\n')
      : '  暂无记录';

  const text =
    `📋 <b>话题双向通信订阅</b>\n\n` +
    `${statusLine}\n\n` +
    `💰 <b>月费：</b>${fee} USDT（TRC20）\n\n` +
    `📜 <b>近期续费记录：</b>\n${historyLines}`;

  const keyboard = new InlineKeyboard()
    .text('💳 发起续费', 'subscribe_pay')
    .text('🔄 刷新状态', 'subscribe_refresh')
    .row()
    .text('❌ 关闭', 'close');

  try {
    if (edit) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err: any) {
    debug('发送状态卡片失败:', err?.message);
  }
}

/** 展示付款信息卡片（pending 订单） */
async function sendPaymentCard(
  ctx: MyContext,
  order: any,
  toAddress: string,
  edit = false,
): Promise<void> {
  const expiredAt = new Date(order.orderExpiredAt);
  const remaining = Math.max(
    0,
    Math.round((expiredAt.getTime() - Date.now()) / 60000),
  );

  const text =
    `💳 <b>发起续费</b>\n\n` +
    `请在 <b>${remaining} 分钟内</b>向以下地址转入：\n\n` +
    `金额：<b>${order.amount} USDT</b>（TRC20-USDT）\n` +
    `收款地址：\n<code>${toAddress}</code>\n\n` +
    `⚠️ 请务必转入<b>精确金额</b>，系统通过金额自动匹配订单。\n\n` +
    `⏰ 订单有效期至：${expiredAt.toLocaleString('zh-CN', {
      hour12: false,
    })}\n\n` +
    `转账完成后点「查询到账」，系统也会每 5 分钟自动检测。`;

  const keyboard = new InlineKeyboard()
    .text('� 查询到账', 'subscribe_check')
    .text('↩️ 返回', 'subscribe_refresh')
    .row()
    .text('❌ 关闭', 'close');

  try {
    if (edit) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err: any) {
    debug('发送付款卡片失败:', err?.message);
  }
}

async function isOwner(ctx: MyContext): Promise<boolean> {
  if (!ctx.currentBot?.owner) return false;
  const ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
  return ownerBotUser?.id === ctx.currentBotUser?.id;
}

export default subscribeComposer;
