import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { sendStatusCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';

const refreshCallback = new Composer<MyContext>();

refreshCallback.callbackQuery(
  'subscribe_refresh',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.currentBot?.isCreatedByAdmin) return;
    await sendStatusCard(ctx, true);
  },
);

export default refreshCallback;
