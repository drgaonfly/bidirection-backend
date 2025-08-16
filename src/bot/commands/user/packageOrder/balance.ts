import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder from '../../../../models/packageOrder';
import Deduction from '../../../../models/deduction';
import { IdGen } from '../../../../utils/idGen';
import { getExchangeRate } from '../../../../utils/getExchange';
import createDebug from 'debug';

const balanceCallback = new Composer<MyContext>();
const debug = createDebug('bot:confirm-package-order');

// 确认套餐订单回调处理
balanceCallback.callbackQuery(/^balance_(trx|usdt)_(.+)$/, async (ctx) => {
  await ctx.conversation.exitAll();

  const match = ctx.callbackQuery.data.match(/^balance_(trx|usdt)_(.+)$/);
  if (!match) {
    await ctx.answerCallbackQuery({ text: '订单ID无效', show_alert: true });
    return;
  }

  const paymentType = match[1] as 'trx' | 'usdt';
  const orderId = match[2];

  debug('确认套餐订单: %s，支付方式: %s', orderId, paymentType);

  // 查找订单
  const order = await PackageOrder.findOne({ id: orderId });

  if (!order) {
    await ctx.answerCallbackQuery({ text: '未找到订单', show_alert: true });
    return;
  }

  if (order.status !== 'pending') {
    await ctx.answerCallbackQuery({
      text: '订单已处理或已失效',
      show_alert: true,
    });
    return;
  }

  let priceToDeduct = order.price; // 默认订单原价
  let balanceKey = paymentType === 'trx' ? 'trx_balance' : 'usdt_balance';

  // 如果订单原本是 USDT 结算，但用户选择 TRX，则需要换算价格
  if (order.paymentType === 'usdt' && paymentType === 'trx') {
    const rate = await getExchangeRate('TRX', 'USDT'); // TRX -> USDT
    priceToDeduct = +(order.price / rate).toFixed(2); // 换算成 TRX
    balanceKey = 'trx_balance';
    order.paymentType = 'trx';
    order.price = priceToDeduct;
    await order.save();
  }

  // 检查余额是否足够
  if ((ctx.currentBotUserConfig as any)[balanceKey] < priceToDeduct) {
    const currentBalance = (ctx.currentBotUserConfig as any)[balanceKey];
    await ctx.reply(
      `${paymentType.toUpperCase()} 余额不足，请先充值，当前余额 ${currentBalance} ${paymentType.toUpperCase()}，还需充值 ${(
        priceToDeduct - currentBalance
      ).toFixed(2)} ${paymentType.toUpperCase()}`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('💰 立即充值', 'recharge'),
      },
    );
    return;
  }

  const balance_before = (ctx.currentBotUserConfig as any)[balanceKey];

  // 扣款
  (ctx.currentBotUserConfig as any)[balanceKey] -= priceToDeduct;
  await ctx.currentBotUserConfig.save();

  // 更新订单状态
  order.status = 'active';
  await order.save();

  // 记录扣费
  await Deduction.create({
    id: await IdGen.next(Deduction, 'id', 6),
    bot: ctx.currentBot._id,
    botUser: ctx.currentBotUser._id,
    proxy: ctx.currentBot.user,
    amount: priceToDeduct,
    currency: paymentType.toUpperCase(),
    reason: `购买能量套餐 ${order.times} 笔`,
    type: 'PackageOrder',
    status: 'completed',
    balance_before,
    balance_after: (ctx.currentBotUserConfig as any)[balanceKey],
    remark: `套餐订单ID: ${order.id}`,
    processedAt: new Date(),
    deductable: order._id,
  });

  await ctx.deleteMessage();

  const info = [
    '✅ 套餐购买成功!',
    `🆔 订单ID:  <code>${order.id}</code>`,
    `✏️ 购买笔数: <b>${order.times}</b>`,
    `⚡ 购买能量: <code>${order.energy}</code> sun`,
    `💵 订单总额: <b>${priceToDeduct} ${paymentType.toUpperCase()}</b>`,
    `🪙 最低消费: <b>${order.minConsumption}</b>`,
    `⏳ 有效期: <b>${order.validityDays} 天</b>`,
  ].join('\n');

  await ctx.reply(info, { parse_mode: 'HTML' });
});

export default balanceCallback;
