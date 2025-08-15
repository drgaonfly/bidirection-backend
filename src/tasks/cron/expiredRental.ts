// src/cron/expiredRentals.ts
import Rental from '../../models/rental';
import BotUser from '../../models/botUser';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';

export async function checkExpiredRentals() {
  try {
    console.log('[expiredRentals] 开始检查过期租赁记录...');
    // 查询已过期但未处理的租赁记录
    const expiredRentals = await Rental.find({
      status: 'pending',
      expiredAt: { $lte: new Date() },
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[expiredRentals] 查询到 ${expiredRentals.length} 个待处理的过期租赁记录`,
    );

    for (const rental of expiredRentals) {
      console.log(`[expiredRentals] 正在处理租赁记录: ${rental.id}`);

      // 设置租赁记录状态为过期
      await Rental.updateOne({ _id: rental._id }, { status: 'expired' });

      console.log(
        `[expiredRentals] 租赁记录 ${rental.id} 状态已更新为 expired`,
      );

      const botUser = await BotUser.findById(rental.botUser);
      const dbBot = rental.bot as IBot;
      const bot = setupBot(dbBot.token);

      if (botUser?.id) {
        try {
          await bot.api.sendMessage(
            botUser.id,
            [
              `❌ 租赁ID  : <code>${rental.id}</code> 已超时未支付，自动取消。`,
              `⚡️ 购买能量：${rental.amount}`,
              `💰 订单金额：${
                rental.price
              } ${rental.crypto_type.toUpperCase()}`,
              `📤 发送地址：<code>${rental.from_address}</code>`,
              `📥 接收地址：<code>${rental.to_address || '无'}</code>`,
            ].join('\n'),
            { parse_mode: 'HTML' },
          );
          console.log(`[expiredRentals] 已通知用户 ${botUser.id} 租赁记录过期`);
        } catch (msgErr) {
          console.error(
            `[expiredRentals] 通知用户 ${botUser.id} 失败:`,
            msgErr,
          );
        }
      } else {
        console.warn(
          `[expiredRentals] 未找到用户信息，无法通知，租赁记录号: ${rental.id}`,
        );
      }

      console.log(`租赁记录 ${rental.id} 已标记为过期`);
    }
    console.log('[expiredRentals] 过期租赁记录处理完成');
  } catch (error) {
    console.error('处理过期租赁记录时出错:', error);
  }
}
