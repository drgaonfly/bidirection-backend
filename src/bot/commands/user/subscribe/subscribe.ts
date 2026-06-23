import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { sendStatusCard } from './helpers';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';

const subscribeCallback = new Composer<MyContext>();

subscribeCallback.callbackQuery(
  'subscribe',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    if (ctx.currentBot?.isCreatedByAdmin) return;

    await sendStatusCard(ctx);
  },
);

export default subscribeCallback;
