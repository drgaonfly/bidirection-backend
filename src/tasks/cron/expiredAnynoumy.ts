// src/cron/expiredAnynoumy.ts
import Anynoumy from '../../models/anynoumy';
import BotUser from '../../models/botUser';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';

export async function checkExpiredAnynoumy() {
  try {
    console.log('[expiredAnynoumy] 开始检查过期匿名订单...');
    // 查询已过期但未处理的匿名订单
    const expiredAnynoumys = await Anynoumy.find({
      status: 'pending',
      expiredAt: { $lte: new Date() },
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[expiredAnynoumy] 查询到 ${expiredAnynoumys.length} 个待处理的过期匿名订单`,
    );

    for (const anynoumy of expiredAnynoumys) {
      console.log(`[expiredAnynoumy] 正在处理匿名订单: ${anynoumy.id}`);

      // 设置匿名订单状态为过期
      await Anynoumy.updateOne({ _id: anynoumy._id }, { status: 'expired' });

      console.log(
        `[expiredAnynoumy] 匿名订单 ${anynoumy.id} 状态已更新为 expired`,
      );

      const botUser = await BotUser.findById(anynoumy.botUser);
      const dbBot = anynoumy.bot as IBot;
      const bot = setupBot(dbBot.token);

      if (botUser?.id) {
        try {
          await bot.api.sendMessage(
            botUser.id,
            [
              `⌛ 匿名号码订单 <code>${anynoumy.id}</code> 已超时未支付，自动取消。`,
              `租用时长：${anynoumy.days} 天${anynoumy.has4 ? '（带4）' : ''}`,
              `订单金额：${anynoumy.amount} ${
                anynoumy.crypto_type?.toUpperCase() || 'USDT'
              }`,
              `支付地址：<code>${anynoumy.to_address || '无'}</code>`,
            ].join('\n'),
            { parse_mode: 'HTML' },
          );
          console.log(
            `[expiredAnynoumy] 已通知用户 ${botUser.id} 匿名订单过期`,
          );
        } catch (msgErr) {
          console.error(
            `[expiredAnynoumy] 通知用户 ${botUser.id} 失败:`,
            msgErr,
          );
        }
      } else {
        console.warn(
          `[expiredAnynoumy] 未找到用户信息，无法通知，匿名订单号: ${anynoumy.id}`,
        );
      }

      console.log(`匿名订单 ${anynoumy.id} 已标记为过期`);
    }
    console.log('[expiredAnynoumy] 过期匿名订单处理完成');
  } catch (error) {
    console.error('处理过期匿名订单时出错:', error);
  }
}
