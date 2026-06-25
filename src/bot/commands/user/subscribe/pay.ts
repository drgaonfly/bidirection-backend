import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import Subscription from '../../../../models/subscription';
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

// 处理免费试用
payCallback.callbackQuery(
  'subscribe_free_trial',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();

    const bot = await Bot.findById(ctx.currentBot._id);
    if (!bot) return;

    // 检查botUser是否已使用过免费试用
    const botUser = await ctx.currentBotUser;
    if (botUser.hasUsedFreeTrial) {
      await ctx.reply(
        '❌ 您已经使用过免费试用，每个用户只能试用一次。\n\n' +
          '如需继续使用，请购买订阅。',
      );
      return;
    }

    // 首次开启时设置试用期开始时间
    if (!bot.topicTrialStartedAt) {
      bot.topicTrialStartedAt = new Date();
    }

    // 启用话题模式
    bot.isTopicModeEnabled = true;
    await bot.save();

    // 标记botUser已使用免费试用
    botUser.hasUsedFreeTrial = true;
    await botUser.save();

    await ctx.reply(
      '✅ 免费试用已开启！\n\n' +
        '话题模式已启动，您可以开始使用群组话题双向通信功能。',
    );
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
