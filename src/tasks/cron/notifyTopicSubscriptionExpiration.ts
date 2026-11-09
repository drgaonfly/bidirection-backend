/**
 * notifyTopicSubscriptionExpiration
 *
 * 检查话题双向通信订阅即将到期（3 天内）的 bot，提前通知 owner。
 * 同时将已到期订阅的 status 更新为 expired。
 *
 * 运行时机：每天 10:00 由 PM2 cron 进程触发。
 */

import Bot from '../../models/bot';
import Subscription from '../../models/subscription';
import { setupBot } from '../../bot/botSetup';
import { InlineKeyboard } from 'grammy';
import createDebug from 'debug';

const debug = createDebug('cron:notifyTopicSubscriptionExpiration');

export async function notifyTopicSubscriptionExpiration(): Promise<void> {
  debug('[notifyTopicSubscriptionExpiration] 开始检查...');
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);

  // ── 1. 标记已到期的订阅记录 ──────────────────────────────
  const expiredResult = await Subscription.updateMany(
    { status: 'paid', endDate: { $lte: now } },
    { $set: { status: 'expired' } },
  );
  debug(
    `[notifyTopicSubscriptionExpiration] 标记到期订阅 ${expiredResult.modifiedCount} 条`,
  );

  // ── 2. 即将到期（3 天内）但未通知的 bot ──────────────────
  const expiringBots = await Bot.find({
    activeTopicGroup: { $ne: null },
    topicSubscriptionExpiredAt: {
      $exists: true,
      $gt: now,
      $lte: threeDaysLater,
    },
    topicSubscriptionNotified: { $ne: true },
  })
    .populate('owner')
    .populate('user')
    .lean();

  debug(
    `[notifyTopicSubscriptionExpiration] 即将到期 bot ${expiringBots.length} 个`,
  );

  for (const bot of expiringBots) {
    try {
      await notifyOwner(bot);
      // 标记已发送提醒，避免重复通知
      await Bot.findByIdAndUpdate(bot._id, {
        topicSubscriptionNotified: true,
      });
    } catch (err: any) {
      debug(
        `[notifyTopicSubscriptionExpiration] bot ${bot.botName} 通知失败:`,
        err?.message,
      );
    }
  }

  // ── 3. 重置「到期后续费」bot 的 topicSubscriptionNotified ──
  // 续费时 topicSubscriptionExpiredAt 已更新，重置标志让下次到期前能再次提醒
  await Bot.updateMany(
    {
      activeTopicGroup: { $ne: null },
      topicSubscriptionNotified: true,
      topicSubscriptionExpiredAt: { $gt: threeDaysLater },
    },
    { $set: { topicSubscriptionNotified: false } },
  );

  debug('[notifyTopicSubscriptionExpiration] 完成');
}

async function notifyOwner(bot: any): Promise<void> {
  const ownerId = bot.owner?.id;
  if (!ownerId) return;

  const expiry = new Date(bot.topicSubscriptionExpiredAt);
  const botInstance = setupBot(bot.token);

  const keyboard = new InlineKeyboard().text('💳 立即续费', 'subscribe_pay');

  await botInstance.api.sendMessage(
    ownerId,
    `⚠️ <b>话题双向通信</b> 即将到期提醒\n\n` +
      `机器人：<b>${bot.botName}</b>（@${bot.userName}）\n` +
      `到期时间：<b>${expiry.toLocaleString('zh-CN', {
        hour12: false,
      })}</b>\n\n` +
      `请点击下方按钮选择套餐续费，系统将自动生成专属转账金额并识别到账。`,
    { parse_mode: 'HTML', reply_markup: keyboard },
  );
}
