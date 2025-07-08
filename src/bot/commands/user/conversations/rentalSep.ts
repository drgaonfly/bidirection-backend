import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import Rental from '../../../../models/rental';
import { generateOrderNumber } from '../../../../utils/generateOrderNumber';
import { IBot } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import createDebug from 'debug';

const debug = createDebug('bot:rental-sep');
const rentalSepCallback = new Composer<MyContext>();

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Regex for validating TRX address: T followed by 33 alphanumeric characters
const TRX_ADDRESS_REGEX = /^T[A-Za-z1-9]{33}$/;

async function rentalSepConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    rental_count,
    bot,
    botUser,
  }: { rental_count: number; bot: IBot; botUser: IBotUser },
) {
  debug('等待用户输入TRX地址');

  await ctx.reply(
    [
      `请输入您要接收能量的TRX地址:`,
      `您选择了 ${rental_count} 笔租用。`,
      `⚠️ 确保输入地址正确，否则将无法到账。`,
      `⏳ 此操作将在 5 分钟后过期。`,
    ].join('\n'),
    { reply_markup: new InlineKeyboard().text('❌ 取消', 'close') },
  );

  const conversationResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  const { message } = conversationResult;

  if (message?.text === '取消') {
    await ctx.reply('已取消租用');
    return;
  }

  // if (conversationResult.callbackQuery) {
  //   const { data } = conversationResult.callbackQuery;
  //   if (data === 'cancel_rental_sep') {
  //     await ctx.reply('已取消租用');
  //     return;
  //   }
  // }

  const trxAddress = message?.text?.trim();

  // Validate TRX address format
  if (!TRX_ADDRESS_REGEX.test(trxAddress || '')) {
    await ctx.reply(
      '❗ 请输入正确的TRX地址格式，地址应以T开头，由34位数字和字母组成。\n',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await rentalSepConversation(conversation, ctx, {
      rental_count,
      bot,
      botUser,
    });
  }

  // // TODO: Add logic to handle the rental request (e.g., generate order, process payment)
  // await ctx.reply(
  //   `✅ 已收到您的TRX地址：\`${trxAddress}\`，正在处理 ${rental_count} 笔租用请求...`,
  //   {
  //     parse_mode: 'HTML',
  //   },
  // );

  debug('bot', bot);

  const rental = await Rental.create({
    id: await generateOrderNumber(),
    from_address: bot.trx20_address,
    to_address: trxAddress,
    amount: bot.uni_energy_amount,
    separation: rental_count,
    price:
      (Number(bot.uni_energy_price) * Number(bot.uni_energy_amount)) / 1000000,
    bot: bot._id,
    botUser: botUser._id,
    status: 'pending',
    type: 'auto',
    crypto_type: 'trx',
    expiredAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const info = [
    '确认订单:',
    `订单ID:  <code>${rental.id}</code>`,
    `购买能量: <code>${rental.amount}</code> (1小时)`,
    `实时单价: <code>${bot.uni_energy_price} sun</code>`,
    `订单总额: <b>${rental.price} ${rental.crypto_type.toUpperCase()}</b>`,
    `接收地址: <code>${rental.to_address}</code>`,
  ].join('\n');

  await ctx.reply(info, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('余额支付', 'pay_ balance')
      .text('Trx支付', `confirm_rental_${rental.id}`),
  });
}

rentalSepCallback.use(createConversation(rentalSepConversation));

rentalSepCallback.callbackQuery(/^rental_sep_(\d+)$/, async (ctx) => {
  debug('rental_sep clicked');
  await ctx.conversation.exitAll();

  const match = ctx.callbackQuery.data.match(/^rental_sep_(\d+)$/);
  const rental_count = parseInt(match[1]);

  await ctx.conversation.enter('rentalSepConversation', {
    rental_count,
    bot: ctx.currentBot,
    botUser: ctx.currentBotUser,
  });

  await ctx.answerCallbackQuery();
});

export default rentalSepCallback;
