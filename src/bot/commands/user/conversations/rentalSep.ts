import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import Rental from '../../../../models/rental';
import { IdGen } from '../../../../utils/idGen';
import { IBot, IPricePair } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { IBotUserConfig } from '../../../../models/botUserConfig';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import createDebug from 'debug';

const debug = createDebug('bot:rental-sep');

const rentalSepCallback = new Composer<MyContext>();
const rentalMessageMap = new Map<string, number>(); // 缓存 rentalId -> messageId

const TIMEOUT = 5 * 60 * 1000;
const TRX_ADDRESS_REGEX = /^T[A-Za-z1-9]{33}$/;

// 渲染订单确认信息
async function renderOrderInfo(ctx: MyContext, rental) {
  const info = [
    '📝 <b>确认订单</b>：',
    `🆔 订单ID号:  <code>${rental.id}</code>`,
    `⚡ 购买能量: <code>${rental.amount}</code>`,
    `✏️ 购买笔数:  <b>${rental.separation} 笔</b>`,
    `💵 订单总额: <b>${rental.price} USDT</b>`,
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
    botUserConfig,
    energy_per_times,
  }: {
    pricePair: IPricePair;
    bot: IBot;
    botUser: IBotUser;
    botUserConfig: IBotUserConfig;
    energy_per_times: number;
  },
) {
  const isExtra = pricePair.expenditure > botUserConfig.usdt_balance;

  let balanceMsg = '';
  if (!isExtra) {
    balanceMsg = `✅ 您当前USDT余额为 ${botUserConfig.usdt_balance}, 余额充足, 可直接使用余额支付。`;
  } else {
    balanceMsg = [
      `❗您的USDT余额不足, 当前余额为 ${botUserConfig.usdt_balance} USDT。`,
      `请先到 '个人信息' -> '我要充值' 功能里额外充值${
        pricePair.expenditure - botUserConfig.usdt_balance
      } USDT, 或继续下单后选择手动支付。`,
    ].join('\n');
  }

  // 1. 先让用户输入地址或取消
  await ctx.reply(
    [
      `请输入您要接收能量的TRX地址:`,
      '',
      `您选择了 ${pricePair.name} 套餐`,
      `笔数: ${pricePair.times} 笔`,
      `价格: ${pricePair.expenditure} USDT`,
      `能量: ${energy_per_times * pricePair.times} sun`,
      `有效期 ${pricePair.expiration} 天`,
      '',
      balanceMsg,
      '',
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
      botUserConfig,
      energy_per_times,
    });
  }

  // 3. 创建订单
  const rental = await Rental.create({
    id: await IdGen.next(Rental, 'id', 6),
    from_address: bot.energy_address,
    to_address: trxAddress,
    amount: pricePair.times * energy_per_times,
    separation: pricePair.times,
    price: pricePair.expenditure,
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

    if (!ctx.currentBot.energy_address) {
      await ctx.reply('⚠️ 机器人没有配置能量地址，请先配置');
      return;
    }

    const adminUser = await getAdminUser();

    if (!adminUser.energy_per_times) {
      await ctx.reply('⚠️ 平台没有配置每笔多少能量，请先配置');
      return;
    }

    await ctx.conversation.enter('rentalSepConversation', {
      pricePair: pricePair,
      bot: ctx.currentBot,
      botUser: ctx.currentBotUser,
      botUserConfig: ctx.currentBotUserConfig,
      energy_per_times: adminUser.energy_per_times,
    });

    await ctx.answerCallbackQuery();
  },
);

export default rentalSepCallback;
