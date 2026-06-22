/**
 * checkTopicSubscription 中间件
 *
 * 仅在话题模式（topicMode）下生效：
 *   - 若订阅有效（topicSubscriptionExpiredAt > now），放行
 *   - 若订阅未开通或已到期：
 *       • 普通用户消息：静默丢弃（不转发到话题），回复引导续费提示
 *       • owner 在话题中的回复：拦截并提示续费
 *
 * 中间件只拦截「需要话题双向通信」的消息，不影响其他功能（群发等）。
 *
 * 使用方式：在 logger.ts 中，进入话题模式分支前 await checkTopicSubscription(ctx, next)
 * 或在 botSetup.ts 中作为独立中间件注入。
 */

import { Middleware } from 'grammy';
import Bot from '../../models/bot';
import { MyContext } from '../types';
import createDebug from 'debug';

const debug = createDebug('bot:checkTopicSubscription');

/**
 * 检查 bot 的话题双向通信订阅是否有效
 */
export function isTopicSubscriptionActive(bot: any): boolean {
  if (!bot.topicSubscriptionExpiredAt) return false;
  return new Date(bot.topicSubscriptionExpiredAt) > new Date();
}

/**
 * 构造续费提示消息（发送给 owner 私聊 或 话题中）
 */
function buildRenewalMessage(bot: any, proxyUser?: any): string {
  const fee = proxyUser?.topicSubscriptionMonthlyFee ?? 25;
  const address = proxyUser?.trx20_address || '（未配置收款地址）';
  const expiry = bot.topicSubscriptionExpiredAt
    ? `到期时间：${new Date(bot.topicSubscriptionExpiredAt).toLocaleString(
        'zh-CN',
        { hour12: false },
      )}\n\n`
    : '';

  return (
    `⚠️ <b>话题双向通信</b> 订阅已到期或未开通\n\n` +
    expiry +
    `请向以下地址转入 <b>${fee} USDT</b>（TRC20）完成续费：\n` +
    `<code>${address}</code>\n\n` +
    `转账后系统将在 <b>5 分钟内</b>自动识别并开通服务。`
  );
}

/**
 * 话题订阅门控中间件
 *
 * 调用方式：作为 Grammy Middleware 使用
 * 仅在 isTopicMode 为 true 时需要调用此中间件。
 */
const checkTopicSubscriptionMiddleware: Middleware<MyContext> = async (
  ctx,
  next,
) => {
  const bot = ctx.currentBot;
  if (!bot) {
    await next();
    return;
  }

  // 母机器人不受订阅限制
  if (bot.isCreatedByAdmin) {
    await next();
    return;
  }

  // 如果当前没有激活话题群组，不需要检查订阅（非话题模式）
  const botDoc = await Bot.findById(bot._id)
    .select(
      'activeTopicGroup topicSubscriptionExpiredAt topicSubscriptionNotified',
    )
    .lean();

  if (!botDoc?.activeTopicGroup) {
    await next();
    return;
  }

  // 订阅有效，直接放行
  if (isTopicSubscriptionActive(botDoc)) {
    debug(`[checkTopicSubscription] bot ${bot.botName} 订阅有效，放行`);
    await next();
    return;
  }

  // ── 订阅已到期或未开通，拦截并提示 ──────────────────────

  debug(`[checkTopicSubscription] bot ${bot.botName} 话题订阅无效，拦截消息`);

  const message = ctx.message;
  if (!message) {
    await next();
    return;
  }

  const renewalMsg = buildRenewalMessage(botDoc, ctx.currentProxyUser);

  // 判断当前是否是 owner 在话题群发消息
  let isOwner = false;
  if (bot.owner) {
    const BotUser = (await import('../../models/botUser')).default;
    const ownerBotUser = await BotUser.findById(bot.owner).lean();
    isOwner = ownerBotUser?.id === ctx.currentBotUser?.id;
  }

  if (isOwner && ctx.chat?.type !== 'private') {
    // owner 在话题群里操作 —— 在话题内回复续费提示
    try {
      await ctx.reply(renewalMsg, {
        parse_mode: 'HTML',
        message_thread_id: message.message_thread_id,
      } as any);
    } catch (_) {
      await ctx.reply(renewalMsg, { parse_mode: 'HTML' });
    }
  } else if (!isOwner && ctx.chat?.type === 'private') {
    // 普通用户私聊 bot —— 回复提示（不转发到话题）
    await ctx.reply('⚠️ 当前服务暂时不可用，请联系管理员。');
  }

  // 拦截，不调用 next()
};

export default checkTopicSubscriptionMiddleware;
