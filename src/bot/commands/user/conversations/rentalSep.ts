import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import Rental from '../../../../models/rental';
import { IdGen } from '../../../../utils/idGen';
import { IBot, IPricePair } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import createDebug from 'debug';

const debug = createDebug('bot:rental-sep');

const rentalSepCallback = new Composer<MyContext>();
const rentalMessageMap = new Map<string, number>(); // 缓存 rentalId -> messageId

const TIMEOUT = 5 * 60 * 1000;
const TRX_ADDRESS_REGEX = /^T[A-Za-z1-9]{33}$/;

// 渲染订单确认信息
async function renderOrderInfo(ctx: MyContext, rental) {
  const unit = rental.crypto_type;

  // 这里我们假设 amount 单位是 sun，1 trx = 1_000_000 sun
  // 订单总额 = expenditure * separation
  // 单价 = expenditure / aqusition (1 trx/能量)
  // 订单能量 = aqusition * separation

  // 这里假设 rental 里已经有 amount, price, separation
  const unitPriceTRX = Number(rental.price) / rental.separation;
  const totalPriceTRX = Number(rental.price);

  const unitPrice = unitPriceTRX.toFixed(6);
  const totalPrice = totalPriceTRX.toFixed(6);

  rental.price = totalPrice;

  await rental.save();

  const info = [
    '📝 <b>确认订单</b>：',
    `🆔 订单ID号:  <code>${rental.id}</code>`,
    `⚡ 购买能量: <code>${rental.amount}</code>`,
    `✏️ 购买笔数:  <b>${rental.separation} 笔</b>`,
    `💰 实时单价: <code>${unitPrice} ${unit.toUpperCase()}</code>`,
    `💵 订单总额: <b>${totalPrice} ${unit.toUpperCase()}</b>`,
    `📥 接收地址: <code>${rental.to_address}</code>`,
    `⏳ 有效期:   <b>${rental.limit_hour} 天</b>`,
  ].join('\n');

  const msgId = rentalMessageMap.get(rental.id);
  if (!msgId) {
    return ctx.reply(info, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('余额支付', `balance_rental_${rental.id}`)
        .text('USDT支付', `confirm_rental_${rental.id}`),
    });
  }

  await ctx.api.editMessageText(ctx.chat!.id, msgId, info, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('余额支付', `balance_rental_${rental.id}`)
      .text('USDT支付', `confirm_rental_${rental.id}`),
  });
}

// 主流程：接收用户地址，创建订单
async function rentalSepConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    pricePair,
    bot,
    botUser,
  }: { pricePair: IPricePair; bot: IBot; botUser: IBotUser },
) {
  // 1. 先让用户输入地址或取消
  await ctx.reply(
    [
      `请输入您要接收能量的TRX地址:`,
      `您选择了 ${pricePair.times} 笔租用。`,
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
      pricePair,
      bot,
      botUser,
    });
  }

  // 3. 创建订单
  // 总能量 = aqusition * rental_count
  // 总价格 = expenditure * rental_count
  const totalAmount = pricePair.aqusition * pricePair.times;
  const totalPrice = pricePair.expenditure;

  const rental = await Rental.create({
    id: await IdGen.next(Rental, 'id', 6),
    from_address: bot.trx20_address,
    to_address: trxAddress,
    amount: totalAmount,
    separation: pricePair.times,
    price: totalPrice,
    bot: bot._id,
    botUser: botUser._id,
    status: 'pending',
    type: 'auto',
    crypto_type: 'usdt',
    limit_hour: pricePair.expiration,
    expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    proxy: botUser._id,
  });

  const sent = await ctx.reply('⏳ 正在生成订单详情...');
  rentalMessageMap.set(rental.id, sent.message_id);

  await renderOrderInfo(ctx, rental);
}

// 注册 conversation
rentalSepCallback.use(createConversation(rentalSepConversation));

// 选择笔数按钮
rentalSepCallback.callbackQuery(
  /^rental_sep_([a-fA-F0-9]{24})$/,
  async (ctx) => {
    debug('rental sep');

    await ctx.conversation.exitAll();

    const match = ctx.callbackQuery.data.match(
      /^rental_sep_([a-fA-F0-9]{24})$/,
    );
    const bot_option_id = match![1];

    console.log('bot_option_id', bot_option_id);

    const pricePair = ctx.currentBot.price_pairs.find(
      (pair) => pair._id.toString() === bot_option_id,
    );

    console.log('pricePair', pricePair);

    await ctx.conversation.enter('rentalSepConversation', {
      pricePair: pricePair,
      bot: ctx.currentBot,
      botUser: ctx.currentBotUser,
    });

    await ctx.answerCallbackQuery();
  },
);

export default rentalSepCallback;
