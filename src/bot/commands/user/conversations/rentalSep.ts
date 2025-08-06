import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import Rental from '../../../../models/rental';
import { generateOrderNumber } from '../../../../utils/generateOrderNumber';
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
  const unit = 'trx';

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
    '确认订单:',
    `订单ID:  <code>${rental.id}</code>`,
    `购买能量: <code>${rental.amount}</code> (1小时)`,
    `实时单价: <code>${unitPrice} ${unit.toUpperCase()}</code>`,
    `订单总额: <b>${totalPrice} ${unit.toUpperCase()}</b>`,
    `接收地址: <code>${rental.to_address}</code>`,
  ].join('\n');

  const msgId = rentalMessageMap.get(rental.id);
  if (!msgId) {
    return ctx.reply(info, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('余额支付', `balance_rental_${rental.id}`)
        .text('Trx支付', `confirm_rental_${rental.id}`),
    });
  }

  await ctx.api.editMessageText(ctx.chat!.id, msgId, info, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('余额支付', `balance_rental_${rental.id}_trx`)
      .text('Trx支付', `confirm_rental_${rental.id}`),
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
  // 1. 先让用户输入地址或取消
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

  // 2. 让用户选择套餐
  // price_pairs: [{ expenditure, aqusition }]
  const price_pairs: IPricePair[] = bot.price_pairs || [];
  if (!price_pairs.length) {
    await ctx.reply('未配置套餐，请联系管理员');
    return;
  }

  // 只支持单一套餐，或让用户选套餐
  // 这里我们让用户选套餐
  const keyboard = new InlineKeyboard();
  price_pairs.forEach((pair, idx) => {
    keyboard.text(
      `${pair.aqusition} 能量 / ${pair.expenditure} TRX`,
      `select_pair_${idx}`,
    );
    if ((idx + 1) % 2 === 0) keyboard.row();
  });
  keyboard.text('❌ 取消', 'close');

  await ctx.reply('请选择套餐:', { reply_markup: keyboard });

  // 等待用户选择套餐
  let selectedPair: IPricePair | null = null;
  while (!selectedPair) {
    const pairResult = await conversation.waitFor(['callback_query:data'], {
      maxMilliseconds: TIMEOUT,
    });

    if (!pairResult) {
      await ctx.reply('操作超时，请重新开始');
      return;
    }

    if (pairResult.callbackQuery?.data === 'close') {
      await pairResult.deleteMessage();
      await ctx.reply('已取消');
      return;
    }

    const match = pairResult.callbackQuery?.data?.match(/^select_pair_(\d+)$/);
    if (match) {
      const idx = parseInt(match[1]);
      if (price_pairs[idx]) {
        selectedPair = price_pairs[idx];
        await pairResult.answerCallbackQuery({ text: '已选择套餐' });
        await pairResult.deleteMessage();
        break;
      }
    } else {
      await pairResult.answerCallbackQuery({
        text: '请选择套餐',
        show_alert: true,
      });
    }
  }

  // 3. 创建订单
  // 总能量 = aqusition * rental_count
  // 总价格 = expenditure * rental_count
  const totalAmount = selectedPair.aqusition * rental_count;
  const totalPrice = selectedPair.expenditure * rental_count;

  const rental = await Rental.create({
    id: await generateOrderNumber(),
    from_address: bot.trx20_address,
    to_address: trxAddress,
    amount: totalAmount,
    separation: rental_count,
    price: totalPrice,
    bot: bot._id,
    botUser: botUser._id,
    status: 'pending',
    type: 'auto',
    crypto_type: 'trx',
    expiredAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const sent = await ctx.reply('⏳ 正在生成订单详情...');
  rentalMessageMap.set(rental.id, sent.message_id);

  await renderOrderInfo(ctx, rental);
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

export default rentalSepCallback;
