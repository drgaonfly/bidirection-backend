import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import { IBot, IPricePair } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { IBotUserConfig } from '../../../../models/botUserConfig';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import { getExchangeRate } from '../../../../utils/getExchange';
import createDebug from 'debug';

const debug = createDebug('bot:package-order');
const packageOrderCallback = new Composer<MyContext>();

async function renderOrderInfo(
  ctx: MyContext,
  tempOrder,
  trxEnough: boolean,
  usdtEnough: boolean,
  opt_id: string,
) {
  const info = [
    '📝 <b>确认订单</b>：',
    `✏️ 购买笔数:  <b>${tempOrder.times} 笔</b>`,
    `⚡ 购买能量: <code>${tempOrder.energy}</code> sun`,
    `💵 订单总额: <code>${tempOrder.usdt_price}</code> <b>USDT</b> 或 <code>${tempOrder.trx_price}</code> <b>TRX</b>`,
    `🪙 最低消费: <b>${tempOrder.minConsumption} 笔</b>`,
    `⏳ 有效期:   <b>${tempOrder.validityDays} 天</b>`,
  ].join('\n');

  const keyboard = new InlineKeyboard();
  if (trxEnough) keyboard.text('TRX余额支付', `balance_trx_${opt_id}`);
  if (usdtEnough) keyboard.text('USDT余额支付', `balance_usdt_${opt_id}`);

  await ctx.reply(info, { parse_mode: 'HTML', reply_markup: keyboard });
}

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

  const usdt_price = pricePair.expenditure;
  const trx_price = +(pricePair.expenditure * processed_rate).toFixed(2);

  const trxEnough = botUserConfig.trx_balance >= trx_price;
  const usdtEnough = botUserConfig.usdt_balance >= usdt_price;

  if (!trxEnough && !usdtEnough) {
    await ctx.reply(
      [
        `❗ 您的 TRX 余额不足，还差 ${(
          trx_price - botUserConfig.trx_balance
        ).toFixed(2)} TRX。`,
        `❗ 您的 USDT 余额不足，还差 ${(
          usdt_price - botUserConfig.usdt_balance
        ).toFixed(2)} USDT。`,
        `请先充值后再购买套餐。`,
      ].join('\n'),
      { reply_markup: new InlineKeyboard().text('💰 立即充值', 'recharge') },
    );
    return;
  }

  const tempOrder = {
    botId: bot._id,
    botUserId: botUser._id,
    proxy: bot.user,
    times: pricePair.times,
    energy: pricePair.times * energy_per_times,
    validityDays: pricePair.expiration,
    minConsumption,
    usdt_price,
    trx_price,
  };

  await renderOrderInfo(ctx, tempOrder, trxEnough, usdtEnough, pricePair._id);
}

packageOrderCallback.use(createConversation(packageOrderConversation));

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

    const adminUser = await getAdminUser();
    if (!adminUser.energy_per_times || !adminUser.recycle_min) {
      await ctx.reply('⚠️ 平台没有配置能量套餐参数，请先联系管理员');
      return;
    }

    await ctx.conversation.enter('packageOrderConversation', {
      pricePair,
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
