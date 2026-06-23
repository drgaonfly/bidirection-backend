import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { isBotOwner, sendStatusCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';

const refreshCallback = new Composer<MyContext>();

refreshCallback.callbackQuery('subscribe_refresh', checkInBot, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isBotOwner(ctx))) return;
  await sendStatusCard(ctx, true);
});

export default refreshCallback;
