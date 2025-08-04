import { Composer } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';
import Payment from '../../../../../models/payment';

const cancelRechargeCallback = new Composer<MyContext>();
const debug = createDebug('bot:取消充值');

cancelRechargeCallback.callbackQuery(/^recharge:cancel_(.+)$/, async (ctx) => {
  debug('取消充值');

  await ctx.conversation.exitAll();

  const paymentId = ctx.match?.[1]; // 提取 payment._id

  // 只允许 pending 状态的订单取消
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    await ctx.answerCallbackQuery('订单不存在或已被删除');
    return;
  }

  if (payment.status !== 'pending') {
    await ctx.answerCallbackQuery('订单已过期或无法取消');
    return;
  }

  await Payment.findByIdAndUpdate(paymentId, {
    status: 'cancelled',
  });

  await ctx.deleteMessage();
});

export default cancelRechargeCallback;
