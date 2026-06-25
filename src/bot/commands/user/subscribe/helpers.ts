import { InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import Subscription from '../../../../models/subscription';
import BotUser from '../../../../models/botUser';
import { formatBeijingDate } from '../../../../utils/formatBeijingDate';
import createDebug from 'debug';

const debug = createDebug('bot:subscribe');

export const ORDER_TIMEOUT_MINUTES = 60;

export async function isBotOwner(ctx: MyContext): Promise<boolean> {
  if (!ctx.currentBot?.owner) return false;
  const ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
  return ownerBotUser?.id === ctx.currentBotUser?.id;
}

export async function createPendingOrder(
  bot: any,
  proxy: any,
  fee: number,
  toAddress: string,
  months: number = 1,
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
    proxy: proxy._id,
    amount: uniqueAmount,
    toAddress,
    orderExpiredAt,
    status: 'pending',
    months,
  });
}

/** 展示订阅状态总览卡片 */
export async function sendStatusCard(
  ctx: MyContext,
  edit = false,
): Promise<void> {
  const bot = await Bot.findById(ctx.currentBot._id)
    .select(
      'topicSubscriptionExpiredAt activeTopicGroup botName isTopicModeEnabled topicTrialStartedAt',
    )
    .lean();

  if (!bot) return;

  const now = new Date();
  const expiry = bot.topicSubscriptionExpiredAt
    ? new Date(bot.topicSubscriptionExpiredAt)
    : null;
  const isActive = !!expiry && expiry > now;
  const fee = ctx.currentProxyUser?.topicSubscriptionMonthlyFee ?? 25;
  const trialDays = ctx.currentProxyUser?.topic_mode_trial_period ?? 0;

  // 计算试用期
  let trialInfo = '';
  if (trialDays > 0 && bot.topicTrialStartedAt) {
    const trialEnd = new Date(bot.topicTrialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    const remainingDays = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (remainingDays > 0) {
      trialInfo = `\n🎉 免费试用：剩余 ${remainingDays} 天`;
    } else {
      trialInfo = `\n⏰ 免费试用：已过期`;
    }
  } else if (trialDays > 0 && !bot.topicTrialStartedAt) {
    trialInfo = `\n🎉 免费试用：${trialDays} 天（开启话题模式后开始计算）`;
  }

  const subscriptionStatus = isActive
    ? `服务期限： ${formatBeijingDate(expiry)}✅`
    : `服务期限：已到期❌`;

  const topicModeStatus = bot.isTopicModeEnabled
    ? `话题模式：已启动✅`
    : `话题模式：未启动❌`;

  const text =
    `📋 群组话题双向通信订阅\n\n` +
    `${subscriptionStatus}${trialInfo}\n\n` +
    `【💳购买订阅】【🎉免费试用】\n` +
    `【${topicModeStatus}】`;

  const keyboard = new InlineKeyboard()
    .text('💳购买订阅', 'subscribe_pay')
    .text('🎉免费试用', 'subscribe_free_trial')
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
