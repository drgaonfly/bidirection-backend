import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Subscription from '../../../../models/subscription';
import { isBotOwner, sendStatusCard, sendPaymentCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';

const checkCallback = new Composer<MyContext>();

checkCallback.callbackQuery('subscribe_check', checkInBot, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await isBotOwner(ctx))) return;

  const pendingOrder = await Subscription.findOne({
    bot: ctx.currentBot._id,
    status: 'pending',
    orderExpiredAt: { $gt: new Date() },
  }).lean();

  if (!pendingOrder) {
    await sendStatusCard(ctx, true);
    return;
  }

  const toAddr = ctx.currentProxyUser?.trx20_address ?? '';
  await sendPaymentCard(ctx, pendingOrder, toAddr, true);
});

export default checkCallback;
