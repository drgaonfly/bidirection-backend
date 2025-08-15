import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import PackageOrder from '../../../../models/packageOrder';
import { IdGen } from '../../../../utils/idGen';
import { IBot, IPricePair } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { IBotUserConfig } from '../../../../models/botUserConfig';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import { getExchangeRate } from '../../../../utils/getExchange';
import createDebug from 'debug';

const debug = createDebug('bot:package-order');

const packageOrderCallback = new Composer<MyContext>();
const orderMessageMap = new Map<string, number>(); // 缓存 orderId -> messageId

async function renderOrderInfo(
  ctx: MyContext,
  order,
  trxEnough: boolean,
  usdtEnough: boolean,
) {
  const info = [
    '📝 <b>确认订单</b>：',
    `🆔 订单ID号:  <code>${order.id}</code>`,
    `✏️ 购买笔数:  <b>${order.times} 笔</b>`,
    `⚡ 购买能量: <code>${order.energy}</code> sun`,
    `💵 订单总额: <b>${order.price} ${order.paymentType.toUpperCase()}</b>`,
    `⏳ 有效期:   <b>${order.validityDays} 天</b>`,
  ].join('\n');

  const keyboard = new InlineKeyboard();
  if (trxEnough) keyboard.text('TRX余额支付', `balance_trx_${order.id}`);
  if (usdtEnough) keyboard.text('USDT余额支付', `balance_usdt_${order.id}`);

  const msgId = orderMessageMap.get(order.id);
  if (!msgId) {
    return ctx.reply(info, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  await ctx.api.editMessageText(ctx.chat!.id, msgId, info, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

// 主流程
async function packageOrderConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    pricePair,
    bot,
    botUser,
    botUserConfig,
    energy_per_times,
    minConsumption,
  }: {
    pricePair: IPricePair;
    bot: IBot;
    botUser: IBotUser;
    botUserConfig: IBotUserConfig;
    energy_per_times: number;
    minConsumption: number;
  },
) {
  const original_rate = await getExchangeRate('TRX', 'USDT');

  const processed_rate = 1 / original_rate;

  const feeRate = 1 + bot.fee / 100;

  const usdt_price = pricePair.expenditure * feeRate;
  const trx_price = +(pricePair.expenditure * processed_rate * feeRate).toFixed(
    2,
  );

  const trxEnough = botUserConfig.trx_balance >= trx_price;
  const usdtEnough = botUserConfig.usdt_balance >= usdt_price;

  // 🚫 两个都不足，直接提示充值并退出
  if (!trxEnough && !usdtEnough) {
    const trxShort = (trx_price - botUserConfig.trx_balance).toFixed(2);
    const usdtShort = (usdt_price - botUserConfig.usdt_balance).toFixed(2);
    await ctx.reply(
      [
        `❗ 您的 TRX 余额不足，还差 ${trxShort} TRX。`,
        `❗ 您的 USDT 余额不足，还差 ${usdtShort} USDT。`,
        `请先充值后再购买套餐。`,
      ].join('\n'),
      { reply_markup: new InlineKeyboard().text('💰 立即充值', 'recharge') },
    );
    return;
  }

  // 创建 PackageOrder 订单
  const order = await PackageOrder.create({
    id: await IdGen.next(PackageOrder, 'id', 6),
    bot: bot._id,
    botUser: botUser._id,
    proxy: botUser._id,
    times: pricePair.times,
    price: trxEnough && !usdtEnough ? trx_price : usdt_price,
    energy: pricePair.times * energy_per_times,
    validityDays: pricePair.expiration,
    minConsumption,
    paymentType: trxEnough && !usdtEnough ? 'trx' : 'usdt', // 默认选择优先的支付方式
    expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    status: 'pending',
  });

  const sent = await ctx.reply('⏳ 正在生成订单详情...');
  orderMessageMap.set(order.id, sent.message_id);

  await renderOrderInfo(ctx, order, trxEnough, usdtEnough);
}

// 注册 conversation
packageOrderCallback.use(createConversation(packageOrderConversation));

// 选择笔数按钮
packageOrderCallback.callbackQuery(
  /^rental_sep_([a-fA-F0-9]{24})$/,
  async (ctx) => {
    debug('package order');

    await ctx.conversation.exitAll();

    const match = ctx.callbackQuery.data.match(
      /^rental_sep_([a-fA-F0-9]{24})$/,
    );
    const bot_option_id = match![1];

    const pricePair = ctx.currentBot.price_pairs.find(
      (pair) => pair._id.toString() === bot_option_id,
    );

    if (!ctx.currentBot.energy_address) {
      await ctx.reply('⚠️ 机器人没有配置能量地址，请先配置');
      return;
    }

    const adminUser = await getAdminUser();
    if (!adminUser.energy_per_times) {
      await ctx.reply('⚠️ 平台没有配置每笔多少能量，请先配置');
      return;
    }
    if (!adminUser.recycle_min) {
      await ctx.reply('⚠️ 平台没有配置低消，请先配置');
      return;
    }

    await ctx.conversation.enter('packageOrderConversation', {
      pricePair: pricePair,
      bot: ctx.currentBot,
      botUser: ctx.currentBotUser,
      botUserConfig: ctx.currentBotUserConfig,
      energy_per_times: adminUser.energy_per_times,
      minConsumption: adminUser.recycle_min,
    });

    await ctx.answerCallbackQuery();
  },
);

export default packageOrderCallback;
