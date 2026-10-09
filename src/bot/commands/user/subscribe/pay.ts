import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Subscription from '../../../../models/subscription';
import Bot from '../../../../models/bot';
import { createPendingOrder, sendPaymentCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';

const payCallback = new Composer<MyContext>();

payCallback.callbackQuery(
  'subscribe_pay',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.currentBot?.isCreatedByAdmin) return;

    const proxy = ctx.currentProxyUser;
    const toAddress: string = ctx.currentProxyUser?.trx20_address || '';

    if (!toAddress) {
      await ctx.reply(
        '❌ 收款地址未配置，请联系管理员设置 trx20 地址后再续费。',
      );
      return;
    }

    const monthlyFee = proxy?.topicSubscriptionMonthlyFee ?? 25;
    const plans = proxy?.subscriptionPlans || [
      { months: 1, price: 15, label: '包月' },
      { months: 6, price: 70, label: '半年' },
      { months: 12, price: 120, label: '一年' },
    ];

    const text =
      `💳 <b>选择订阅套餐</b>\n\n` +
      `💰 月费标准：${monthlyFee} USDT/月\n\n` +
      `<b>请选择订阅时长：</b>`;

    const keyboard = new InlineKeyboard();
    plans.forEach((plan, index) => {
      keyboard.text(
        `${plan.label} ${plan.price}U`,
        `subscribe_plan_${plan.months}`,
      );
      if (index < plans.length - 1) {
        keyboard.row();
      }
    });
    keyboard.row().text('❌ 返回', 'subscribe_refresh');

    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err: any) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  },
);

// 处理订阅套餐（动态）
payCallback.callbackQuery(
  /^subscribe_plan_(\d+)$/,
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();
    const match = ctx.callbackQuery?.data?.match(/^subscribe_plan_(\d+)$/);
    if (!match) return;
    const months = parseInt(match[1], 10);
    await handleSubscription(ctx, months);
  },
);

async function handleSubscription(ctx: MyContext, months: number) {
  const bot = await Bot.findById(ctx.currentBot._id)
    .select('botName topicSubscriptionExpiredAt activeTopicGroup')
    .lean();

  const proxy = ctx.currentProxyUser;

  if (!bot) return;

  const plans = proxy?.subscriptionPlans || [
    { months: 1, price: 15, label: '包月' },
    { months: 6, price: 70, label: '半年' },
    { months: 12, price: 120, label: '一年' },
  ];
  const plan = plans.find((p) => p.months === months);

  if (!plan) {
    await ctx.reply('❌ 未找到对应的订阅套餐');
    return;
  }

  const toAddress: string = ctx.currentProxyUser?.trx20_address || '';

  // 若已有 pending 订单（未超时），直接展示，不重复创建
  const existing = await Subscription.findOne({
    bot: bot._id,
    status: 'pending',
    orderExpiredAt: { $gt: new Date() },
  }).lean();

  const order =
    existing ??
    (await createPendingOrder(bot, proxy, plan.price, toAddress, months));

  await sendPaymentCard(ctx, order, toAddress, true);
}

export default payCallback;
