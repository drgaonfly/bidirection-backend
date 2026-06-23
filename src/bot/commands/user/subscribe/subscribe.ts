import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { isBotOwner, sendStatusCard } from './helpers';
import { checkInBot } from '../../../middlewares/checkInBot';

const subscribeCallback = new Composer<MyContext>();

subscribeCallback.callbackQuery('subscribe', checkInBot, async (ctx) => {
  if (ctx.currentBot?.isCreatedByAdmin) return;
  if (!(await isBotOwner(ctx))) {
    await ctx.reply('❌ 只有机器人拥有者才能管理订阅。');
    return;
  }
  await sendStatusCard(ctx);
});

export default subscribeCallback;
