import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import Subscription from '../../../../models/subscription';
import { isOwner, createPendingOrder, sendPaymentCard } from './helpers';

const payCallback = new Composer<MyContext>();

payCallback.callbackQuery('subscribe_pay', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isOwner(ctx))) return;

  const bot = await Bot.findById(ctx.currentBot._id)
    .select('botName topicSubscriptionExpiredAt activeTopicGroup')
    .lean();

  if (!bot) return;

  const fee: number = ctx.currentProxyUser?.topicSubscriptionMonthlyFee ?? 25;
  const toAddress: string = ctx.currentProxyUser?.trx20_address || '';

  if (!toAddress) {
    await ctx.reply('❌ 收款地址未配置，请联系管理员设置 trx20 地址后再续费。');
    return;
  }

  // 若已有 pending 订单（未超时），直接展示，不重复创建
  const existing = await Subscription.findOne({
    bot: bot._id,
    status: 'pending',
    orderExpiredAt: { $gt: new Date() },
  }).lean();

  const order = existing ?? (await createPendingOrder(bot, fee, toAddress));

  await sendPaymentCard(ctx, order, toAddress, true);
});

export default payCallback;
