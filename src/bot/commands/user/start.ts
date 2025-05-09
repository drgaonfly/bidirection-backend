import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../types';
// import BotUser from '../../../models/botUser';
import { IMenu } from '../../../models/bot';
// import User from '../../../models/user';
import createDebug from 'debug';
// import Transaction from '../../../models/transaction';
// import { IdGen } from '../../../utils/idGen';
// import { useSummary } from '../../../utils/useEjsMessage';

const startCommand = new Composer<MyContext>();

const debug = createDebug('bot:error');

// const handleTransactionCommand = async (
//   ctx: MyContext,
//   type: '+' | '-' | '入款' | '下发' | '下发-',
// ) => {
//   const [, , amount, unit, rate, userRaw, feeRate] = ctx.match!;
//   const isDeposit = type === '+' || type === '入款' || type === '下发-';

//   console.log({
//     amount,
//     unit,
//     rate,
//     feeRate,
//     userRaw,
//   });

//   const user = await User.findOne({
//     firstName: ctx.update.message.from.first_name,
//     lastName: ctx.update.message.from.last_name,
//   });

//   const bot = await Bot.findOneAndUpdate({
//     token: ctx.api.token,
//     isOnline: true,
//   });

//   let existingBotUser = await BotUser.findOne({
//     id: ctx.update.message.from.id.toString(),
//   });

//   if (!existingBotUser) {
//     existingBotUser = new BotUser({
//       id: await IdGen.next(BotUser, 'id', 6),
//       bot,
//       user,
//       userName:
//         ctx.update.message.from.last_name + ctx.update.message.from.first_name,
//       firstName: ctx.update.message.from.first_name,
//       lastName: ctx.update.message.from.last_name,
//       fee_rate: feeRate || 0,
//       exchange_rate: rate || 7.2,
//     });

//     await existingBotUser.save();
//   }

//   if (isDeposit) {
//     const transaction = new Transaction({
//       id: await IdGen.next(Transaction, 'id', 6),
//       bot,
//       amount: Number(amount),
//       exchange_rate: existingBotUser.exchange_rate || 1,
//       fee_rate: existingBotUser.fee_rate || 0,
//       type: 'deposit',
//     });

//     await transaction.save();
//   } else {
//     const existing = await Transaction.findOne({ bot });

//     if (!existing) {
//       await ctx.reply(`未找到对应的入款记录，无法执行减款`);
//       return;
//     }

//     const transaction = new Transaction({
//       id: await IdGen.next(Transaction, 'id', 6),
//       bot,
//       amount: Number(amount),
//       exchange_rate: existingBotUser.exchange_rate,
//       fee_rate: existingBotUser.fee_rate,
//       type: 'withdraw',
//     });

//     await transaction.save();
//   }

//   const renderSummary = useSummary();

//   const [depositTimes, withdrawTimes, totalDeposits, totalWithdraws] =
//     await Promise.all([
//       Transaction.countDocuments({ bot, type: 'deposit' }),
//       Transaction.countDocuments({ bot, type: 'withdraw' }),
//       Transaction.find({ bot, type: 'deposit' }),
//       Transaction.find({ bot, type: 'withdraw' }),
//     ]);

//   const message = await renderSummary({
//     title: '记账机器人',
//     depositTimes,
//     widthdrawTimes: withdrawTimes,
//     deposits: totalDeposits,
//     widthdraws: totalWithdraws,
//     feeRate: existingBotUser.fee_rate,
//     exchangeRate: existingBotUser.exchange_rate,
//     unit: unit,
//   });

//   await ctx.reply(message, { parse_mode: 'HTML' });
// };

const setMenu = (menu: IMenu[]) => {
  const inlineMenu = new InlineKeyboard();

  menu.forEach((item) => {
    inlineMenu.url(item.menuName, item.url).row();
  });

  return inlineMenu;
};

// 开始命令处理
startCommand.command('start', async (ctx) => {
  debug('start');

  const bot = ctx.currentBot;

  // 发送长文本消息并附带 Inline Menu
  await ctx.reply(bot.message || '欢迎使用机器人', {
    reply_markup: setMenu(bot.menus),
  });
});

// +100 /1.1 @user 0.03
// startCommand.hears(
//   /^([+-])\s*(\d+(?:\.\d+)?)(元|U)?(?:\/(\d+(?:\.\d+)?))?(?:\s+(@?\S+))?(?:\s+(\d+(?:\.\d+)?))?$/,
//   async (ctx) => {
//     await handleTransactionCommand(ctx, ctx.match![1] as '+' | '-');
//   },
// );

// 入款100 /1.1 @user 0.03
// startCommand.hears(
//   /^(入款)\s*(\d+(?:\.\d+)?)(元|U)?(?:\/(\d+(?:\.\d+)?))?(?:\s+(@?\S+))?(?:\s+(\d+(?:\.\d+)?))?$/,
//   async (ctx) => {
//     await handleTransactionCommand(ctx, '入款');
//   },
// );

// 下发100 /1.1 @user 0.03
// startCommand.hears(
//   /^(下发)\s*(\d+(?:\.\d+)?)(元|U)?(?:\/(\d+(?:\.\d+)?))?(?:\s+(@?\S+))?(?:\s+(\d+(?:\.\d+)?))?$/,
//   async (ctx) => {
//     await handleTransactionCommand(ctx, '下发');
//   },
// );

// 下发-100 /1.1 @user 0.03
// startCommand.hears(
//   /^(下发-)\s*(\d+(?:\.\d+)?)(元|U)?(?:\/(\d+(?:\.\d+)?))?(?:\s+(@?\S+))?(?:\s+(\d+(?:\.\d+)?))?$/,
//   async (ctx) => {
//     await handleTransactionCommand(ctx, '下发-');
//   },
// );

export default startCommand;

// 处理机器人被添加到群组的事件
