// src/cron/expiredExchanges.ts
import Payment from '../../models/payment';
import BotUser from '../../models/botUser';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';

export async function checkExpiredExchanges() {
  try {
    console.log('[expiredExchanges] 开始检查过期兑换记录...');
    // 查询已过期但未处理的兑换记录
    const expiredExchanges = await Payment.find({
      status: 'pending',
      expiredAt: { $lte: new Date() },
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[expiredExchanges] 查询到 ${expiredExchanges.length} 个待处理的过期兑换记录`,
    );

    for (const exchange of expiredExchanges) {
      console.log(
        `[expiredExchanges] 正在处理兑换记录: ${exchange.orderNumber}`,
      );

      // 设置兑换记录状态为过期
      await Payment.updateOne({ _id: exchange._id }, { status: 'expired' });

      console.log(
        `[expiredExchanges] 兑换记录 ${exchange.orderNumber} 状态已更新为 expired`,
      );

      const botUser = await BotUser.findById(exchange.botUser);
      const dbBot = exchange.bot as IBot;
      const bot = setupBot(dbBot.token);

      if (botUser?.id) {
        try {
          // 构建订阅信息文本
          let subscriptionInfoText = '';
          if (exchange.subscriptionInfo) {
            const { label, price, days } = exchange.subscriptionInfo;
            subscriptionInfoText =
              `\n<b>订阅类型:</b> ${label}\n` +
              `<b>套餐时长:</b> ${days} 天\n` +
              `<b>兑换记录金额:</b> ${price} USDT\n`;
          }

          await bot.api.sendMessage(
            botUser.id,
            `⌛ 兑换记录 <code>${
              exchange.orderNumber
            }</code> 已超时未支付，自动取消。${
              subscriptionInfoText ? '\n' + subscriptionInfoText : ''
            }`,
            { parse_mode: 'HTML' },
          );
          console.log(
            `[expiredExchanges] 已通知用户 ${botUser.id} 兑换记录过期`,
          );
        } catch (msgErr) {
          console.error(
            `[expiredExchanges] 通知用户 ${botUser.id} 失败:`,
            msgErr,
          );
        }
      } else {
        console.warn(
          `[expiredExchanges] 未找到用户信息，无法通知，兑换记录号: ${exchange.orderNumber}`,
        );
      }

      console.log(`兑换记录 ${exchange.orderNumber} 已标记为过期`);
    }
    console.log('[expiredExchanges] 过期兑换记录处理完成');
  } catch (error) {
    console.error('处理过期兑换记录时出错:', error);
  }
}
