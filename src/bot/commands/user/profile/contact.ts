import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

const contactCallback = new Composer<MyContext>();
const debug = createDebug('bot:contact');

contactCallback.callbackQuery('contact', async (ctx) => {
  debug('客服联系');

  await ctx.reply(ctx.currentBot.contact);

  await ctx.answerCallbackQuery('客服链接发送成功');
});

export default contactCallback;
