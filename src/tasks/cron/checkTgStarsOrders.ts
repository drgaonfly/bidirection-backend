import TgStarOrder from '../../models/tgStar';
import BotUser from '../../models/botUser';
import Bot from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import { buyTgStars } from '../../utils/buyTelegramStars';
import Group from '../../models/group';
import axios from 'axios';
import createDebug from 'debug';

const debug = createDebug('cron:checkTgStarOrers');

async function getBotStarBalance(botToken: string): Promise<number> {
  const url = `https://api.telegram.org/bot${botToken}/getMyStarBalance`;
  const resp = await axios.get(url);
  if (!resp.data.ok) {
    throw new Error(`getMyStarBalance error: ${resp.data.description}`);
  }
  return Number(resp.data.result.balance);
}

/**
 * 检查所有 pending 的星星订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkTgStarsOrders() {
  try {
    console.log('[checkTgStarOrers] 开始检查所有待处理的星星订单...');

    // 查询所有待处理的星星订单（pending 且 type 为 recharge）
    const tgStars = await TgStarOrder.find({
      status: 'pending',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkTgStarOrers] 查询到 ${tgStars.length} 个待处理的星星订单`,
    );

    const now = new Date();

    for (const tgStar of tgStars) {
      // 检查是否过期
      if (now > tgStar.expiredAt) {
        console.log(
          `[checkPremiumOrders] 订单 ${tgStar.id} 已过期，更新状态为expired`,
        );
        tgStar.status = 'expired';
        await tgStar.save();
        continue;
      }

      // 检查 bot 是否有 trx20_address
      const receiveAddress = tgStar.paymentAddress;

      const bot = await Bot.findById(tgStar.bot);

      const botUser = await BotUser.findById(tgStar.botUser);

      let transfers;

      try {
        const response = await fetchTrc20Transactions(receiveAddress);

        // console.log('response', response);

        transfers = response
          .filter((tx) => tx.token_info?.symbol === 'USDT')
          .map((tx) => ({
            trade_id: tx.transaction_id,
            from_address: tx.from,
            to_address: tx.to,
            money: Number(tx.value) / 1_000_000,
            time: Math.floor(tx.block_timestamp / 1000),
          }));
      } catch (err) {
        console.error(
          `[checkTransferIn] 获取地址 ${receiveAddress} 转账记录失败:`,
          err,
        );
        continue;
      }

      // 查找是否有金额和订单匹配的转账
      // 允许0.001 USDT的误差（处理不同平台的小数精度差异）
      const AMOUNT_TOLERANCE = 0.001;
      const matchedTransfer = transfers.find(
        (t) => Math.abs(t.money - tgStar.amount) <= AMOUNT_TOLERANCE,
      );

      if (!matchedTransfer) {
        console.log(
          `[checkTgStarOrers] 订单 ${tgStar.id} 未检测到 ${receiveAddress} 收到 ${tgStar.amount} USDT 的转账（允许±${AMOUNT_TOLERANCE}误差），跳过`,
        );
        continue;
      }

      // 检查 tgStar 是否已经有 txHash，防止重复处理
      if (tgStar.hash && tgStar.hash === matchedTransfer.trade_id) {
        console.log(
          `[checkTgStarOrers] 订单 ${tgStar.id} 已处理过该转账哈希，跳过`,
        );
        continue;
      }

      tgStar.hash = matchedTransfer.trade_id;
      tgStar.actualAmount = matchedTransfer.money;
      await tgStar.save();

      // 调用api来给用户星星，改状态，接受tx_id
      // 调电报 API 给用户充值星星
      try {
        const balance = await getBotStarBalance(
          process.env.SUPER_ADMIN_BOT_TOKEN,
        );
        if (balance < tgStar.stars) {
          console.warn(
            `[buyTgStars] 余额不足：当前 ${balance} 星，缺少 ${
              tgStar.stars - balance
            } 星`,
          );

          continue;
        }

        const result = await buyTgStars(
          process.env.SUPER_ADMIN_BOT_TOKEN,
          botUser.id,
          tgStar.id,
          tgStar.stars,
        );

        console.log(
          `[checkTgStarOrers] 成功给用户 ${botUser.id} 充值星星`,
          result,
        );
      } catch (err) {
        console.error(`[checkTgStarOrers] 调用 Telegram Stars API 失败:`, err);
        continue; // 不要继续往下执行
      }

      // 发送支付成功通知
      const telegramBot = setupBot(bot.token);

      try {
        await telegramBot.api.sendMessage(
          botUser.id,
          `✅ 充值成功！\n\n` +
            `订单号: <code>${tgStar.id}</code>\n` +
            `充值金额: <b>${tgStar.amount} USDT</b>\n` +
            { parse_mode: 'HTML' },
        );

        console.log(`[checkTgStarOrers] 已通知用户 ${botUser.id} 充值成功`);

        // 群播报
        const groups = await Group.find({
          bot: bot._id,
        });

        debug('群播报', { groups });
      } catch (msgErr) {
        console.error(
          `[checkTgStarOrers] 通知用户 ${botUser.id} 失败:`,
          msgErr,
        );
      }
    }

    console.log('[checkTgStarOrers] 待处理星星订单处理完成');
  } catch (error) {
    console.error('[checkTgStarOrers] 处理待处理星星订单时出错:', error);
  }
}
