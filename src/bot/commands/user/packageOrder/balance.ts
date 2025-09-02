import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import PackageOrder from '../../../../models/packageOrder';
import Deduction from '../../../../models/deduction';
import { IdGen } from '../../../../utils/idGen';
import { getExchangeRate } from '../../../../utils/getExchange';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import { findBotProxy } from '../../../../services/findBotProxy';
import createDebug from 'debug';
import RevenueShare from '../../../../models/revenueShare';

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

    const current_price_pair = ctx.currentBot.price_pairs.find(
      (pair) => pair._id.toString() === bot_option_id,
    );

    const original_rate = await getExchangeRate('TRX', 'USDT');
    const processed_rate = 1 / original_rate;

    const fee_for_trx = 1 + ctx.currentBot.fee / 100;

    const usdt_price = current_price_pair.sale;
    const trx_price = +(
      current_price_pair.sale *
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
      // 给当前机器人的配置加余额
      ctx.currentBotUserConfig.trx_balance = newBalance;
    } else {
      //给当前机器人的配置加余额
      ctx.currentBotUserConfig.usdt_balance = newBalance;

      // 递归给上级加余额
    }
    await ctx.currentBotUserConfig.save();

    const balance_before = currentBalance;

    // ✅ 真正创建订单
    const order = await PackageOrder.create({
      id: await IdGen.next(PackageOrder, 'id', 6),
      name: current_price_pair.name,
      bot: ctx.currentBot._id,
      botUser: ctx.currentBotUser._id,
      proxy: ctx.currentBot.user,
      times: current_price_pair.times,
      current_times: current_price_pair.times,
      energy: current_price_pair.times * adminUser.energy_per_times,
      validityDays: current_price_pair.expiration,
      minConsumption: 2,
      price: priceToDeduct,
      paymentType,
      expiredAt: new Date(
        Date.now() + current_price_pair.expiration * 24 * 60 * 60 * 1000,
      ),
      status: 'using',
    });

    // 扣费记录
    await Deduction.create({
      id: await IdGen.next(Deduction, 'id', 6),
      bot: ctx.currentBot._id,
      botUser: ctx.currentBotUser._id,
      proxy: ctx.currentBot.user,
      amount: priceToDeduct,
      currency: paymentType.toUpperCase(),
      reason: `购买能量套餐 ${current_price_pair.times} 笔`,
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

    // 递归给上级加余额
    async function distributeProfitToSuperiors(bot, level = 1) {
      const currentBot = bot;
      if (!currentBot || !currentBot.clonedFrom) return;

      const superiorBot = await Bot.findById(currentBot.clonedFrom);
      if (!superiorBot) return;

      const superiorBot_pricePairs = superiorBot.price_pairs || [];
      const filtered_superiorBot_pricePair = superiorBot_pricePairs.find(
        (pair) =>
          pair.times === current_price_pair.times &&
          pair.type === current_price_pair.type &&
          pair.expiration === current_price_pair.expiration,
      );

      if (!filtered_superiorBot_pricePair) return;

      const profit =
        filtered_superiorBot_pricePair.sale -
        filtered_superiorBot_pricePair.expenditure;

      const superior = await findBotProxy(superiorBot); // 机器人绑定的后台用户，代理

      if (profit > 0) {
        superior.proxyBotUserConfig[
          paymentType === 'trx' ? 'trx_balance' : 'usdt_balance'
        ] += profit;

        await superior.proxyBotUserConfig.save();

        await RevenueShare.create({
          proxy: superior.proxyUser._id,
          bot: superiorBot._id,
          amount: profit,
          balance_type: paymentType === 'trx' ? 'trx_balance' : 'usdt_balance',
          type: 'PackageOrder',
          revenue_shareable: order._id,
        });

        // 打印每一级加了多少
        console.log(
          `分润第${level}级: proxy=${superior?.proxyUser?.name}, botUser=${
            superior?.proxyBotUser?.userName ||
            (superior?.proxyBotUser?.firstName || '') +
              (superior?.proxyBotUser?.lastName || '')
          }, bot=${superiorBot?.botName}, 加了${profit}${
            paymentType === 'trx' ? ' TRX' : ' USDT'
          }`,
        );
      } else {
        // 也可以打印没有分润的情况
        console.log(
          `分润第${level}级: proxy=${superior?.proxyUser?.name}, botUser=${superior?.proxyBotUser?.userName}, bot=${superiorBot?.botName}, 没有分润`,
        );
      }

      // 递归到上一级
      await distributeProfitToSuperiors(superiorBot, level + 1);
    }

    await distributeProfitToSuperiors(ctx.currentBot);

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
            ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
          )
          .text('📝 我的笔数套餐', 'my_packageOrder'),
      },
    );
  },
);

export default balanceCallback;
