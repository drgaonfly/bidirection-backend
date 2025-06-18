import { setupBot } from '../../bot/botSetup';
import { IBotUser } from '../../models/botUser';
import Wallet from '../../models/wallet';
import { getUSDTTransfersIn } from '../../services/checkTrxIn';
import { getUSDTTransfersOut } from '../../services/checkTrxOut';
import { IdGen } from '../../utils/idGen';
import Receipt from '../../models/receipt';
import { IBot } from '../../models/bot';

type TransferType = 'transferIn' | 'transferOut';
type TransferInfo = {
  type: TransferType;
  icon: string;
  label: string;
  transfers: any[];
};

/**
 * 检查钱包的转入和转出交易
 * 向用户发送详细的交易通知
 */
export async function checkTransfer() {
  try {
    console.log('[checkTransfer] 开始检查转入和转出...');

    const wallets = await Wallet.find({
      isOnline: true,
    })
      .populate({ model: 'BotUser', path: 'botUser' })
      .populate({ model: 'Bot', path: 'bot' });

    console.log(`[checkTransfer] 查询到 ${wallets.length} 个在线的钱包`);

    for (const wallet of wallets) {
      const botUser = wallet.botUser as IBotUser;
      const bot = wallet.bot as IBot;
      const address = wallet.address;
      const telegramBot = setupBot(bot.token);

      // 查询该地址近X天的USDT转入和转出
      let transfersIn = [];
      let transfersOut = [];
      try {
        [transfersIn, transfersOut] = await Promise.all([
          getUSDTTransfersIn(address),
          getUSDTTransfersOut(address),
        ]);
      } catch (err) {
        console.error(`[checkTransfer] 获取地址 ${address} 转账记录失败:`, err);
        continue;
      }

      // 定义转账类型信息
      const transferInfos: TransferInfo[] = [
        {
          type: 'transferIn',
          icon: '🟢',
          label: '收入',
          transfers: transfersIn,
        },
        {
          type: 'transferOut',
          icon: '🔴',
          label: '支出',
          transfers: transfersOut,
        },
      ];

      // 处理每种类型的转账
      for (const info of transferInfos) {
        const matchedTransfer = info.transfers.find((t) => t.money);
        if (!matchedTransfer) continue;

        const existingReceipt = await Receipt.exists({
          hash: matchedTransfer.trade_id,
          bot: bot._id,
          botUser: botUser._id,
        });

        if (matchedTransfer.trade_id && existingReceipt) continue;

        const receipt = await Receipt.create({
          id: await IdGen.next(Receipt, 'id', 6),
          type: info.type,
          wallet: wallet._id,
          amount: matchedTransfer.money,
          hash: matchedTransfer.trade_id,
          bot: bot._id,
          botUser: botUser._id,
          time: matchedTransfer.time,
        });

        const message = [
          `🏠监听账户: <code>${address}</code>`,
          `💸交易类型: ${info.icon}${info.label}`,
          `💸交易金额: ${receipt.amount.toFixed(4)} USDT`,
          `⏰交易时间: ${new Date(receipt.time * 1000).toLocaleString()}`,
          `🔗所属公链: Tron`,
          `💰监控地址: <code>${address}</code>`,
          `💰对方地址: <code>${matchedTransfer.buyer}</code>`,
        ].join('\n');

        try {
          await telegramBot.api.sendMessage(botUser.id, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '查看详情',
                    url: `https://tronscan.org/#/transaction/${receipt.hash}`,
                  },
                ],
              ],
            },
          });
        } catch (err) {
          console.error(
            `[checkTransfer] 通知用户 ${botUser.id} ${info.label}失败:`,
            err,
          );
        }
      }
    }

    console.log('[checkTransfer] 转入和转出处理完成');
  } catch (error) {
    console.error('[checkTransfer] 处理转账时出错:', error);
  }
}
