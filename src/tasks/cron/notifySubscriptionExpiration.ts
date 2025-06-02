import Subscription, {
  SubscriptionStatus,
  renewalOptions,
} from '../../models/subscription';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import { IBotUser } from '../../models/botUser';

/**
 * 检查所有即将在3天内过期的订阅，发送提醒通知。
 * 只有当订阅状态为 active 且未发送过提醒时才发送通知。
 */
export async function notifySubscriptionExpiration() {
  try {
    console.log('[notifySubscriptionExpiration] 开始检查即将过期的订阅...');
    const now = new Date();
    console.log(now.toLocaleString('zh-CN', { hour12: false }));

    // 计算3天后的日期
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    // 查询所有将在3天内过期且状态为 active 的订阅
    const expiringSubscriptions = await Subscription.find({
      status: SubscriptionStatus.Active,
      expiredAt: {
        $gt: now,
        $lte: threeDaysLater,
      },
      preExpirationNotified: { $ne: true }, // 未发送过提醒的订阅
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[notifySubscriptionExpiration] 查询到 ${expiringSubscriptions.length} 个即将过期的订阅`,
    );

    for (const subscription of expiringSubscriptions) {
      const botUser = subscription.botUser as IBotUser;
      const bot = subscription.bot as IBot;

      // 获取订阅类型详细信息
      let planLabel = subscription.plan;
      if (renewalOptions[subscription.plan]) {
        planLabel = renewalOptions[subscription.plan].label;
      }

      // 发送订阅即将过期通知
      const telegramBot = setupBot(bot.token);
      try {
        const expiredAtStr = subscription.expiredAt
          ? subscription.expiredAt.toLocaleString('zh-CN', { hour12: false })
          : '';

        const msg =
          `⚠️ 提醒：您的订阅即将在3天后到期。\n\n` +
          `订阅类型: <b>${planLabel}</b>\n` +
          `到期时间: <code>${expiredAtStr}</code>\n` +
          `订阅ID: <code>${subscription.id}</code>\n\n` +
          `如需继续使用服务，请及时续费。`;

        await telegramBot.api.sendMessage(botUser.id, msg, {
          parse_mode: 'HTML',
        });
        console.log(
          `[notifySubscriptionExpiration] 已通知用户 ${botUser.id} 订阅即将过期`,
        );

        // 标记订阅已发送提醒
        subscription.preExpirationNotified = true;
        await subscription.save();
      } catch (msgErr) {
        console.error(
          `[notifySubscriptionExpiration] 通知用户 ${botUser.id} 失败:`,
          msgErr,
        );
      }
    }

    console.log('[notifySubscriptionExpiration] 即将过期订阅通知处理完成');
  } catch (error) {
    console.error(
      '[notifySubscriptionExpiration] 处理即将过期订阅时出错:',
      error,
    );
  }
}
