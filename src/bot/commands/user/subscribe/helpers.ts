import { InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import Subscription from '../../../../models/subscription';
import BotUser from '../../../../models/botUser';
import createDebug from 'debug';

const debug = createDebug('bot:subscribe');

export const ORDER_TIMEOUT_MINUTES = 60;

export async function isOwner(ctx: MyContext): Promise<boolean> {
  if (!ctx.currentBot?.owner) return false;
  const ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
  return ownerBotUser?.id === ctx.currentBotUser?.id;
}

export async function createPendingOrder(
  bot: any,
  fee: number,
  toAddress: string,
): Promise<any> {
  const orderExpiredAt = new Date();
  orderExpiredAt.setMinutes(
    orderExpiredAt.getMinutes() + ORDER_TIMEOUT_MINUTES,
  );

  // 生成唯一尾数（0.01~0.99），用于精确匹配链上转账金额
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
export async function sendStatusCard(
  ctx: MyContext,
  edit = false,
): Promise<void> {
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

  const recentPaid = await Subscription.find({ bot: bot._id, status: 'paid' })
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
export async function sendPaymentCard(
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
    .text('🔍 查询到账', 'subscribe_check')
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
