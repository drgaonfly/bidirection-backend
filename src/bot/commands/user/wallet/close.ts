import { Composer } from 'grammy';
import { MyContext } from '../../../types';

const walletCloseComposer = new Composer<MyContext>();

walletCloseComposer.callbackQuery('close', async (ctx) => {
  await ctx.conversation.exitAll();
  await ctx.deleteMessage();
});

export default walletCloseComposer;
