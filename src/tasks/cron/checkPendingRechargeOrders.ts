import Payment from '../../models/payment';
import { IBotUser } from '../../models/botUser';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import BotUserConfig from '../../models/botUserConfig';
import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import Group from '../../models/group';
import createDebug from 'debug';
import { formatBeijingDate } from '../../utils/formatBeijingDate';
import { InlineKeyboard } from 'grammy';

const debug = createDebug('cron:checkPendingRechargeOrders');

/**
 * 检查所有 pending 的充值订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkPendingRechargeOrders() {
  try {
    console.log('[checkPendingRechargeOrders] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 recharge）
    const pendingPayments = await Payment.find({
      status: 'pending',
      type: 'recharge',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkPendingRechargeOrders] 查询到 ${pendingPayments.length} 个待处理的充值订单`,
    );

    for (const payment of pendingPayments) {
      // 检查 bot 是否有 trx20_address
      const botUser = payment.botUser as IBotUser;
      const bot = payment.bot as IBot;
      const receiveAddress = bot.trx20_address || payment.receiveAddress;
      if (!receiveAddress) {
        console.warn(
          `[checkPendingRechargeOrders] 订单 ${payment.orderNumber} 的机器人未设置收款地址，跳过`,
        );
        continue;
      }

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
        (t) => Math.abs(t.money - payment.amount) <= AMOUNT_TOLERANCE,
      );

      if (!matchedTransfer) {
        console.log(
          `[checkPendingRechargeOrders] 订单 ${payment.orderNumber} 未检测到 ${receiveAddress} 收到 ${payment.amount} USDT 的转账（允许±${AMOUNT_TOLERANCE}误差），跳过`,
        );
        continue;
      }

      // 检查 payment 是否已经有 txHash，防止重复处理
      if (payment.txHash && payment.txHash === matchedTransfer.trade_id) {
        console.log(
          `[checkPendingRechargeOrders] 订单 ${payment.orderNumber} 已处理过该转账哈希，跳过`,
        );
        continue;
      }

      // 充值到账，更新用户余额
      const userConfig = await BotUserConfig.findOne({
        bot: bot._id,
        botUser: botUser._id,
      });

      let newBalance = payment.amount;
      if (userConfig) {
        newBalance = (userConfig.usdt_balance || 0) + payment.amount;
        await BotUserConfig.findOneAndUpdate(
          { _id: userConfig._id },
          {
            $inc: { balance: payment.amount },
          },
          { new: true },
        );
      } else {
        // 新建用户配置
        await BotUserConfig.create({
          bot: bot._id,
          botUser: botUser._id,
          balance: payment.amount,
        });
      }

      // 更新 payment 状态
      payment.status = 'paid';
      payment.txHash = matchedTransfer.trade_id;
      payment.sendAddress = matchedTransfer.buyer;
      payment.transactionAt = new Date(matchedTransfer.time * 1000);
      payment.paymentAmount = matchedTransfer.money; // 记录实际支付金额
      await payment.save();

      // 发送支付成功通知
      const telegramBot = setupBot(bot.token);

      try {
        await telegramBot.api.deleteMessage(
          payment.tgChatId,
          payment.tgMessageId,
        );
        console.log(
          `[checkPendingRechargeOrders] 已删除用户 ${payment.tgChatId} 的订单消息 (message_id: ${payment.tgMessageId})`,
        );
        await telegramBot.api.sendMessage(
          botUser.id,
          `✅ 充值成功！\n\n` +
            `订单号: <code>${payment.orderNumber}</code>\n` +
            `充值金额: <b>${payment.amount} USDT</b>\n` +
            `实际到账: <b>${payment.paymentAmount} USDT</b>\n` +
            `到账余额: <b>${
              userConfig ? newBalance : payment.amount
            } USDT</b>\n` +
            `感谢您的充值！`,
          { parse_mode: 'HTML' },
        );

        console.log(
          `[checkPendingRechargeOrders] 已通知用户 ${botUser.id} 充值成功`,
        );

        // 群播报
        const groups = await Group.find({
          bot: bot._id,
        });

        debug('群播报', { groups });

        for (const group of groups) {
          await telegramBot.api.sendMessage(
            group.id,
            [
              `✅ 成功充值`,
              '\n',
              `🔸买家 ID： <code>${botUser.displayName.replace(
                /^(.{2}).*(.{2})$/,
                '$1****$2',
              )}</code>`,
              `🔸充值编号： <code>${payment.orderNumber}</code>`,
              `🔸充值金额： ${payment.amount.toFixed(3)} USDT`,
              `🔸到账金额： ${payment.paymentAmount.toFixed(3)} USDT`,
              `🔸充值日期： ${formatBeijingDate(payment.createdAt)}`,
              `\n📣 您也可以点击下方按钮购买号码。`,
            ].join('\n'),
            {
              parse_mode: 'HTML',
              reply_markup: new InlineKeyboard()
                .url('自助取号机器人🤖', `https://t.me/${bot.userName}`)
                .row()
                .url('能量会员机器人🤖', 'https://t.me/aodi98_bot')
                .url('能量会员机器人🤖', 'https://smmfs.com'),
            },
          );
        }
      } catch (msgErr) {
        console.error(
          `[checkPendingRechargeOrders] 通知用户 ${botUser.id} 失败:`,
          msgErr,
        );
      }

      console.log(
        `[checkPendingRechargeOrders] 已为订单 ${
          payment.orderNumber
        } 完成充值，到账余额: ${userConfig ? newBalance : payment.amount}`,
      );
    }

    console.log('[checkPendingRechargeOrders] 待处理充值订单处理完成');
  } catch (error) {
    console.error(
      '[checkPendingRechargeOrders] 处理待处理充值订单时出错:',
      error,
    );
  }
}
