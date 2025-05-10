import { Composer } from 'grammy';
import { MyContext } from '../../types';
import createDebug from 'debug';
import Transaction from '../../../models/transaction';
import { IdGen } from '../../../utils/idGen';
import { useDeposit } from '../../../utils/useEjsMessage';

const depositCommand = new Composer<MyContext>();

const debug = createDebug('bot:error');

// 处理充值命令
depositCommand.command('deposit', async (ctx) => {
  debug('deposit');
  // 发送长文本消息并附带 Inline Menu

  await ctx.reply('输入: +100 或 + 100 的格式即可入款');
});

depositCommand.hears(/^(\+)\s*(\d+)$/, async (ctx) => {
  const amount = ctx.match[2];
  if (!amount) {
    await ctx.reply('请使用正确的格式：+<金额>\n例如: +100 或 + 100');
    return;
  }

  const bot = ctx.currentBot;

  const botUser = ctx.currentBotUser;

  const transaction = new Transaction({
    id: await IdGen.next(Transaction, 'id', 6),
    bot,
    amount: Number(amount),
    // exchange_rate: botUser.exchange_rate || 1,
    // fee_rate: botUser.fee_rate || 0,
    type: 'deposit',
  });

  await transaction.save();

  const renderSummary = useDeposit();

  const [depositTimes, totalDeposits] = await Promise.all([
    Transaction.countDocuments({ bot, type: 'deposit' }),
    Transaction.find({ bot, type: 'deposit' }),
  ]);

  // const message = await renderSummary({
  //   title: '记账机器人',
  //   depositTimes,
  //   deposits: totalDeposits,
  //   feeRate: botUser.fee_rate,
  //   exchangeRate: botUser.exchange_rate,
  //   unit: '元',
  // });

  // await ctx.reply(message, { parse_mode: 'HTML' });
});

export default depositCommand;
