// import { Composer } from 'grammy';
// import { MyContext } from '../../types';
// import createDebug from 'debug';
// import Transaction from '../../../models/transaction';
// import { IdGen } from '../../../utils/idGen';
// import { useWithdraw } from '../../../utils/useEjsMessage';

// const withdrawCommand = new Composer<MyContext>();

// const debug = createDebug('bot:error');

// // 处理充值命令
// withdrawCommand.command('withdraw', async (ctx) => {
//   debug('withdraw');
//   // 发送长文本消息并附带 Inline Menu

//   await ctx.reply('输入: 下发100 或 下发 100 的格式即可入款');
// });

// withdrawCommand.hears(/^(下发)\s*(\d+)$/, async (ctx) => {
//   const amount = ctx.match[2];
//   if (!amount) {
//     await ctx.reply('请使用正确的格式：+<金额>\n例如: 下发100 或 下发 100');
//     return;
//   }

//   const bot = ctx.currentBot;

//   // const existingBotUser = ctx.currentBotUser;

//   const transaction = new Transaction({
//     id: await IdGen.next(Transaction, 'id', 6),
//     bot,
//     amount: Number(amount),
//     type: 'withdraw',
//   });

//   await transaction.save();

//   const renderSummary = useWithdraw();

//   const [withdrawTimes, totalWithdraws] = await Promise.all([
//     Transaction.countDocuments({ bot, type: 'withdraw' }),
//     Transaction.find({ bot, type: 'withdraw' }),
//   ]);

//   const message = await renderSummary({
//     title: '记账机器人',
//     widthdrawTimes: withdrawTimes,
//     widthdraws: totalWithdraws,
//     feeRate: ctx.currentGroup.fee_rate,
//     exchangeRate: ctx.currentGroup.exchange_rate,
//     unit: '元',
//   });

//   await ctx.reply(message, { parse_mode: 'HTML' });
// });

// export default withdrawCommand;
