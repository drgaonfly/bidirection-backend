import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder from '../../../../models/packageOrder';
import Deduction from '../../../../models/deduction';
import { IdGen } from '../../../../utils/idGen';
import { getExchangeRate } from '../../../../utils/getExchange';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import createDebug from 'debug';

const balanceCallback = new Composer<MyContext>();
const debug = createDebug('bot:confirm-package-order');

balanceCallback.callbackQuery(
  /^balance_(trx|usdt)_([a-fA-F0-9]{24})$/,
  async (ctx) => {
    await ctx.conversation.exitAll();

    debug('balanceCallback');

    const match = ctx.callbackQuery.data.match(
      /^balance_(trx|usdt)_([a-fA-F0-9]{24})$/,
    );
    if (!match) return;

    const paymentType = match[1] as 'trx' | 'usdt';

    const bot_option_id = match![2];

    const pricePair = ctx.currentBot.price_pairs.find(
      (pair) => pair._id.toString() === bot_option_id,
    );

    const original_rate = await getExchangeRate('TRX', 'USDT');
    const processed_rate = 1 / original_rate;

    const fee_for_trx = 1 + ctx.currentBot.fee / 100;

    const usdt_price = pricePair.expenditure;
    const trx_price = +(
      pricePair.expenditure *
      processed_rate *
      fee_for_trx
    ).toFixed(2);

    const adminUser = await getAdminUser();

    const priceToDeduct = paymentType === 'trx' ? trx_price : usdt_price;

    // 获取当前余额
    // 获取余额并保证是数字
    let currentBalance: number;
    if (paymentType === 'trx') {
      currentBalance = Number(ctx.currentBotUserConfig.trx_balance);
      if (isNaN(currentBalance)) currentBalance = 0;
    } else {
      currentBalance = Number(ctx.currentBotUserConfig.usdt_balance);
      if (isNaN(currentBalance)) currentBalance = 0;
    }

    // 扣款
    debug('currentBalance', currentBalance);

    debug('priceToDeduct', priceToDeduct);

    const newBalance = currentBalance - priceToDeduct;
    if (isNaN(newBalance) || newBalance < 0) {
      await ctx.reply('余额异常，请联系客服');
      return;
    }

    if (paymentType === 'trx') {
      ctx.currentBotUserConfig.trx_balance = newBalance;
    } else {
      ctx.currentBotUserConfig.usdt_balance = newBalance;
    }
    await ctx.currentBotUserConfig.save();

    const balance_before = currentBalance;

    // ✅ 真正创建订单
    const order = await PackageOrder.create({
      id: await IdGen.next(PackageOrder, 'id', 6),
      name: pricePair.name,
      bot: ctx.currentBot._id,
      botUser: ctx.currentBotUser._id,
      proxy: ctx.currentBot.user,
      times: pricePair.times,
      current_times: pricePair.times,
      energy: pricePair.times * adminUser.energy_per_times,
      validityDays: pricePair.expiration,
      minConsumption: adminUser.recharge_min,
      price: priceToDeduct,
      paymentType,
      expiredAt: new Date(
        Date.now() + pricePair.expiration * 24 * 60 * 60 * 1000,
      ),
      status: 'pending',
    });

    // 扣费记录
    await Deduction.create({
      id: await IdGen.next(Deduction, 'id', 6),
      bot: ctx.currentBot._id,
      botUser: ctx.currentBotUser._id,
      proxy: ctx.currentBot.user,
      amount: priceToDeduct,
      currency: paymentType.toUpperCase(),
      reason: `购买能量套餐 ${pricePair.times} 笔`,
      type: 'PackageOrder',
      status: 'completed',
      balance_before,
      balance_after:
        paymentType === 'trx'
          ? ctx.currentBotUserConfig.trx_balance
          : ctx.currentBotUserConfig.usdt_balance,
      remark: `套餐订单ID: ${order.id}`,
      processedAt: new Date(),
      deductable: order._id,
    });

    await ctx.editMessageText(
      [
        '✅ 套餐购买成功!',
        `🆔 订单ID:  <code>${order.id}</code>`,
        `✏️ 购买笔数: <b>${order.times}</b>`,
        `⚡ 购买能量: <code>${order.energy}</code> sun`,
        `💵 订单总额: <b>${priceToDeduct} ${paymentType.toUpperCase()}</b>`,
        `🪙 最低消费: <b>${order.minConsumption}</b>`,
        `⏳ 有效期: <b>${order.validityDays} 天</b>`,
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .url(
            '联系客服',
            ctx.currentBot.customer_service_link || 'https://t.me/infoswqz',
          )
          .text('📝 我的笔数套餐', 'my_packageOrder'),
      },
    );
  },
);

export default balanceCallback;
