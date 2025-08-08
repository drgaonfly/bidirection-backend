import Rental from '../../models/rental';
import { IBotUser } from '../../models/botUser';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import {
  fetchTrc20Transactions,
  rentEnergy,
} from '../../utils/fetchTransactions';
// import Group from '../../models/group';
// import createDebug from 'debug';
// import { formatBeijingDate } from '../../utils/formatBeijingDate';
// import { InlineKeyboard } from 'grammy';

// import { TronWeb } from 'tronweb';

// const tronWeb = new TronWeb({
//   fullHost: 'https://api.trongrid.io',
// });

// const debug = createDebug('cron:checkPendingRental');

/**
 * 检查所有 pending 的充值订单，只有当 bot.energy_address 收到正确金额，才为用户充值
 */
export async function checkPendingUsdtRental() {
  try {
    console.log('[checkPendingRental] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 Rental）
    const pendingRentals = await Rental.find({
      status: 'pending',
      crypto_type: 'trx',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkPendingRental] 查询到 ${pendingRentals.length} 个待处理的充值订单`,
    );

    for (const rental of pendingRentals) {
      // 检查 bot 是否有 energy_address
      const botUser = rental.botUser as IBotUser;
      const bot = rental.bot as IBot;
      const receiveAddress = bot.energy_address || rental.to_address;
      if (!receiveAddress) {
        console.warn(
          `[checkPendingRental] 订单 ${rental.id} 的机器人未设置收款地址，跳过`,
        );
        continue;
      }

      // 查询该地址近5天的USDT转账
      let transfers;

      try {
        const response = await fetchTrc20Transactions(receiveAddress);

        // console.log('response', response);

        transfers = response
          .filter((tx) => tx.token_info?.symbol === 'USDT')
          .map((tx) => ({
            hash: tx.transaction_id,
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

      // 只接收转入的
      const filterdTransfers = transfers.filter(
        (t) =>
          t.to_address === receiveAddress && t.from_address !== receiveAddress,
      );

      // 查找是否有金额和订单匹配的转账
      // 允许0.001 USDT的误差（处理不同平台的小数精度差异）
      const AMOUNT_TOLERANCE = 0.001;
      const matchedTransfer = filterdTransfers.find(
        (t) => Math.abs(t.money - rental.price) <= AMOUNT_TOLERANCE,
      );

      if (!matchedTransfer) {
        console.log(
          `[checkPendingRental] 订单 ${rental.id} 未检测到 ${receiveAddress} 收到 ${rental.price} usdt 的转账（允许±${AMOUNT_TOLERANCE}误差），跳过`,
        );
        continue;
      }

      // 检查 payment 是否已经有 txHash，防止重复处理
      if (rental.tx_id && rental.tx_id === matchedTransfer.trade_id) {
        console.log(
          `[checkPendingRental] 订单 ${rental.id} 已处理过该转账哈希，跳过`,
        );
        continue;
      }

      const result = await rentEnergy(
        rental,
        rental.to_address,
        rental.price,
        rental.crypto_type,
      );

      const telegramBot = setupBot(bot.token);

      const info = [
        '确认订单:',
        `订单ID:  <code>${rental.id}</code>`,
        `购买能量: <code>${rental.amount}</code> (1小时)`,
        `订单总额: <b>${rental.price} ${rental.crypto_type.toUpperCase()}</b>`,
        `接收地址: <code>${rental.to_address}</code>`,
      ].join('\n');

      if (result) {
        // 更新 payment 状态
        rental.status = 'success';
        rental.tx_id = matchedTransfer.trade_id;
        rental.transactionAt = new Date(matchedTransfer.time * 1000);
        rental.actual_price = matchedTransfer.money; // 记录实际支付金额
        await rental.save();

        await telegramBot.api.sendMessage(botUser.id, info);
      } else {
        await telegramBot.api.sendMessage(botUser.id, '租赁失败', {
          parse_mode: 'HTML',
        });
      }
    }

    console.log('[checkPendingRental] 待处理充值订单处理完成');
  } catch (error) {
    console.error('[checkPendingRental] 处理待处理充值订单时出错:', error);
  }
}
