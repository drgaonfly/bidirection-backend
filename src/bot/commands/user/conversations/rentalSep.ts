import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import Rental from '../../../../models/rental';
import { generateOrderNumber } from '../../../../utils/generateOrderNumber';
import { IBot } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { getExchangeRate } from '../../../../utils/getExchange';
// import { getAccountBalances } from '../../../../utils/fetchTransactions'
import createDebug from 'debug';

const debug = createDebug('bot:rental-sep');

const rentalSepCallback = new Composer<MyContext>();
const rentalMessageMap = new Map<string, number>(); // 缓存 rentalId -> messageId

const TIMEOUT = 5 * 60 * 1000;
const TRX_ADDRESS_REGEX = /^T[A-Za-z1-9]{33}$/;

// 渲染订单确认信息
async function renderOrderInfo(ctx: MyContext, rental, bot: IBot) {
  const exchangeRate = await getExchangeRate('TRX', 'USDT');

  const isUSDT = rental.crypto_type === 'usdt';
  const unit = isUSDT ? 'usdt' : 'trx';

  const unitPriceTRX =
    (Number(bot.uni_energy_price) / 1_000_000) * Number(bot.uni_energy_amount);
  const totalPriceTRX = unitPriceTRX * rental.separation;

  const unitPrice = isUSDT
    ? (unitPriceTRX * exchangeRate).toFixed(6)
    : unitPriceTRX.toFixed(6);
  const totalPrice = isUSDT
    ? (totalPriceTRX * exchangeRate).toFixed(6)
    : totalPriceTRX.toFixed(6);

  rental.price = totalPrice;

  await rental.save();

  const info = [
    '确认订单:',
    `订单ID:  <code>${rental.id}</code>`,
    `购买能量: <code>${rental.amount}</code> (1小时)`,
    `实时单价: <code>${unitPrice} ${unit.toUpperCase()}</code>`,
    `订单总额: <b>${totalPrice} ${unit.toUpperCase()}</b>`,
    `接收地址: <code>${rental.to_address}</code>`,
  ].join('\n');

  const switchBtn: [string, string] = isUSDT
    ? ['切换TRX', `turn_to_trx_${rental.id}`]
    : ['切换USDT', `turn_to_usdt_${rental.id}`];

  const msgId = rentalMessageMap.get(rental.id);
  if (!msgId) {
    return ctx.reply(info, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text(...switchBtn)
        .text('余额支付', `balance_rental_${rental.id}`)
        .text(isUSDT ? 'USDT支付' : 'Trx支付', `confirm_rental_${rental.id}`),
    });
  }

  await ctx.api.editMessageText(ctx.chat!.id, msgId, info, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text(...switchBtn)
      .text(
        '余额支付',
        `balance_rental_${rental.id}_${isUSDT ? 'usdt' : 'trx'}`,
      )
      .text(isUSDT ? 'USDT支付' : 'Trx支付', `confirm_rental_${rental.id}`),
  });
}

// 主流程：接收用户地址，创建订单
async function rentalSepConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    rental_count,
    bot,
    botUser,
  }: { rental_count: number; bot: IBot; botUser: IBotUser },
) {
  await ctx.reply(
    [
      `请输入您要接收能量的TRX地址:`,
      `您选择了 ${rental_count} 笔租用。`,
      `⚠️ 确保输入地址正确，否则将无法到账。`,
      `⏳ 此操作将在 5 分钟后过期。`,
    ].join('\n'),
    { reply_markup: new InlineKeyboard().text('❌ 取消', 'close') },
  );

  const result = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  if (result?.callbackQuery?.data === 'close') {
    await ctx.deleteMessage();
    await ctx.reply('已取消');
    return;
  }

  const trxAddress = result?.message?.text?.trim();

  if (!trxAddress || !TRX_ADDRESS_REGEX.test(trxAddress)) {
    await ctx.reply('❗ 地址格式错误，请以 T 开头并为 34 位', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await rentalSepConversation(conversation, ctx, {
      rental_count,
      bot,
      botUser,
    });
  }

  const rental = await Rental.create({
    id: await generateOrderNumber(),
    from_address: bot.trx20_address,
    to_address: trxAddress,
    amount: bot.uni_energy_amount,
    separation: rental_count,
    price:
      (Number(bot.uni_energy_price) *
        Number(bot.uni_energy_amount) *
        Number(rental_count)) /
      1_000_000,
    bot: bot._id,
    botUser: botUser._id,
    status: 'pending',
    type: 'auto',
    crypto_type: 'trx',
    expiredAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const sent = await ctx.reply('⏳ 正在生成订单详情...');
  rentalMessageMap.set(rental.id, sent.message_id);

  await renderOrderInfo(ctx, rental, bot);
}

// 注册 conversation
rentalSepCallback.use(createConversation(rentalSepConversation));

// 选择笔数按钮
rentalSepCallback.callbackQuery(/^rental_sep_(\d+)$/, async (ctx) => {
  debug('rental sep');

  await ctx.conversation.exitAll();

  const match = ctx.callbackQuery.data.match(/^rental_sep_(\d+)$/);
  const rental_count = parseInt(match![1]);

  await ctx.conversation.enter('rentalSepConversation', {
    rental_count,
    bot: ctx.currentBot,
    botUser: ctx.currentBotUser,
  });

  await ctx.answerCallbackQuery();
});

// 切换为 USDT
rentalSepCallback.callbackQuery(/^turn_to_usdt_(.+)$/, async (ctx) => {
  const rentalId = ctx.match[1];
  const rental = await Rental.findOne({ id: rentalId });
  if (!rental)
    return ctx.answerCallbackQuery({ text: '订单不存在', show_alert: true });

  rental.crypto_type = 'usdt';
  await rental.save();
  await renderOrderInfo(ctx, rental, ctx.currentBot);
  await ctx.answerCallbackQuery();
});

// 切换为 TRX
rentalSepCallback.callbackQuery(/^turn_to_trx_(.+)$/, async (ctx) => {
  const rentalId = ctx.match[1];
  const rental = await Rental.findOne({ id: rentalId });
  if (!rental)
    return ctx.answerCallbackQuery({ text: '订单不存在', show_alert: true });

  rental.crypto_type = 'trx';
  await rental.save();
  await renderOrderInfo(ctx, rental, ctx.currentBot);
  await ctx.answerCallbackQuery();
});

export default rentalSepCallback;
