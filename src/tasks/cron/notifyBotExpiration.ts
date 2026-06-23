import Bot from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import BotUser from '../../models/botUser';

export const notifyBotExpiration = async () => {
  try {
    console.log('[notifyBotExpiration] 开始检查即将过期的机器人...');
    const now = new Date();
    console.log(now.toLocaleString('zh-CN', { hour12: false }));

    // Calculate the date 3 days from now
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    // Find all bots that will expire in 3 days and haven't been notified
    const expiringBots = await Bot.find({
      expireAt: {
        $exists: true,
        $gt: now,
        $lte: threeDaysLater,
      },
      type: 'custom',
      preExpirationNotified: { $ne: true },
    }).populate('owner');

    console.log(
      `[notifyBotExpiration] 查询到 ${expiringBots.length} 个即将过期的机器人`,
    );

    for (const bot of expiringBots) {
      console.log(`[notifyBotExpiration] 正在处理机器人: ${bot.botName}`);

      // 获取机器人实例
      const botInstance = setupBot(bot.token);

      // 通知 owner
      const ownerUser = bot.owner ? await BotUser.findById(bot.owner) : null;
      if (ownerUser?.id) {
        try {
          await botInstance.api.sendMessage(
            ownerUser.id,
            `⚠️ 提醒：机器人 <b>${bot.botName}</b> (@${bot.userName}) 将在3天后过期\n` +
              `到期时间: ${bot.topicSubscriptionExpiredAt?.toLocaleString()}\n` +
              `请及时续费以继续使用服务。`,
            { parse_mode: 'HTML' },
          );
          console.log(
            `[notifyBotExpiration] 已通知 owner ${ownerUser.id} 机器人即将过期`,
          );
        } catch (msgErr) {
          console.error(
            `[notifyBotExpiration] 通知 owner ${ownerUser.id} 失败:`,
            msgErr,
          );
        }
      }

      // Mark the bot as notified for pre-expiration
      await Bot.updateOne(
        { _id: bot._id },
        { $set: { preExpirationNotified: true } },
      );

      console.log(`[notifyBotExpiration] 机器人 ${bot.botName} 已发送过期提醒`);
    }

    console.log('[notifyBotExpiration] 即将过期机器人通知处理完成');
  } catch (error) {
    console.error('[notifyBotExpiration] 处理即将过期机器人时出错:', error);
    throw error;
  }
};
