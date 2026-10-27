/**
 * scripts/recoverTimeoutOrders.ts
 *
 * 一次性脚本：扫描指定时间范围内因超时未被识别的 timeout 订单，
 * 查找链上实际到账的 USDT 转账，自动恢复为 paid 并激活 bot 订阅。
 *
 * 使用方式：
 *   npx ts-node src/scripts/recoverTimeoutOrders.ts
 *
 * 可选环境变量：
 *   RECOVER_HOURS=30   往前追溯多少小时（默认 30，覆盖昨晚8点）
 */

import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import Subscription from '../models/subscription';
import Bot from '../models/bot';
import { getUSDTTransfers } from '../services/checkUsdt';
import { setupBot } from '../bot/botSetup';
// 默认往前追溯 30 小时，覆盖昨晚 8 点付款的情况
const RECOVER_HOURS = Number(process.env.RECOVER_HOURS ?? 30);

async function main() {
  await setupDB();
  await setupRedis();

  const now = new Date();
  const lookbackMs = RECOVER_HOURS * 60 * 60 * 1000;
  const since = new Date(now.getTime() - lookbackMs);

  console.log(`\n========================================`);
  console.log(`[recover] 开始扫描 timeout 订单`);
  console.log(
    `[recover] 追溯范围：${since.toLocaleString('zh-CN', {
      hour12: false,
    })} ～ 现在`,
  );
  console.log(`========================================\n`);

  // 查找该时间段内超时的订单（orderExpiredAt 在 since ~ now 之间）
  const timeoutOrders = await Subscription.find({
    status: 'timeout',
    orderExpiredAt: { $gte: since, $lte: now },
  })
    .populate({
      path: 'bot',
      select: 'botName userName token owner topicSubscriptionExpiredAt user',
      populate: [
        { path: 'owner', select: 'id' },
        { path: 'user', select: 'trx20_address subscriptionPlans' },
      ],
    })
    .lean();

  console.log(
    `[recover] 找到 ${timeoutOrders.length} 个待检查的 timeout 订单\n`,
  );

  if (timeoutOrders.length === 0) {
    console.log('[recover] 无需处理，退出。');
    process.exit(0);
  }

  let recoveredCount = 0;

  for (const order of timeoutOrders) {
    const bot = order.bot as any;
    if (!bot) {
      console.log(`[recover] 订单 ${order._id} 无关联 bot，跳过`);
      continue;
    }

    const toAddress: string = order.toAddress;
    const requiredAmount: number = order.amount;

    console.log(`[recover] 检查订单 ${order._id}`);
    console.log(`         bot: ${bot.botName} (@${bot.userName})`);
    console.log(
      `         应付金额: ${requiredAmount} USDT → 地址: ${toAddress}`,
    );
    console.log(
      `         订单超时时间: ${new Date(order.orderExpiredAt).toLocaleString(
        'zh-CN',
        { hour12: false },
      )}`,
    );

    // 查询链上转账，窗口扩展到追溯的全部时间，注意 getUSDTTransfers 参数单位是分钟
    const transfers = await getUSDTTransfers(
      toAddress,
      (RECOVER_HOURS + 1) * 60,
    );

    let matched = false;
    for (const transfer of transfers) {
      // 只处理入账
      if (transfer.to_address.toLowerCase() !== toAddress.toLowerCase())
        continue;

      // 金额匹配（±0.005 浮点容忍）
      if (Math.abs(transfer.money - requiredAmount) > 0.005) continue;

      // 防止同一笔 txHash 被多个订单认领
      const alreadyClaimed = await Subscription.exists({
        txHash: transfer.trade_id,
      });
      if (alreadyClaimed) {
        console.log(
          `         txHash ${transfer.trade_id} 已被其他订单认领，跳过`,
        );
        continue;
      }

      // ── 确认到账，恢复订单 ──────────────────────────────────
      const currentExpiry =
        bot.topicSubscriptionExpiredAt &&
        new Date(bot.topicSubscriptionExpiredAt) > now
          ? new Date(bot.topicSubscriptionExpiredAt)
          : now;

      const newExpiry = new Date(currentExpiry);
      const daysToAdd = order.days ?? (order.months ? order.months * 30 : 30);
      newExpiry.setDate(newExpiry.getDate() + daysToAdd);

      await Subscription.findByIdAndUpdate(order._id, {
        status: 'paid',
        txHash: transfer.trade_id,
        fromAddress: transfer.from_address,
        paidAmount: transfer.money,
        paidAt: now,
        startDate: currentExpiry,
        endDate: newExpiry,
      });

      await Bot.findByIdAndUpdate(bot._id, {
        topicSubscriptionExpiredAt: newExpiry,
      });

      console.log(`\n  ✅ 恢复成功！`);
      console.log(`     txHash:   ${transfer.trade_id}`);
      console.log(`     实付金额: ${transfer.money} USDT`);
      console.log(
        `     续期至:   ${newExpiry.toLocaleString('zh-CN', {
          hour12: false,
        })}\n`,
      );

      // 通知 bot owner
      try {
        const ownerId = bot.owner?.id;
        if (ownerId) {
          const botInstance = setupBot(bot.token);
          await botInstance.api.sendMessage(
            ownerId,
            `✅ <b>话题双向通信</b> 续费已补录！\n\n` +
              `您的付款已被系统识别（此前因链上确认延迟导致订单超时）。\n\n` +
              `金额：<b>${transfer.money} USDT</b>\n` +
              `服务有效期至：<b>${newExpiry.toLocaleString('zh-CN', {
                hour12: false,
              })}</b>\n\n` +
              `感谢您的耐心等待！`,
            { parse_mode: 'HTML' },
          );
          console.log(`     已通知 owner (userId: ${ownerId})`);
        }
      } catch (notifyErr: any) {
        console.warn(`     通知 owner 失败: ${notifyErr?.message}`);
      }

      recoveredCount++;
      matched = true;
      break;
    }

    if (!matched) {
      console.log(`         ❌ 未找到匹配的链上转账\n`);
    }
  }

  console.log(`\n========================================`);
  console.log(
    `[recover] 完成：共恢复 ${recoveredCount} / ${timeoutOrders.length} 个订单`,
  );
  console.log(`========================================\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[recover] 执行失败:', err);
  process.exit(1);
});
