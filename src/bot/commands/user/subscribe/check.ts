import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Subscription from '../../../../models/subscription';
import { sendStatusCard, sendPaymentCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';

const checkCallback = new Composer<MyContext>();

checkCallback.callbackQuery(
  'subscribe_check',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();

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
  },
);

export default checkCallback;
