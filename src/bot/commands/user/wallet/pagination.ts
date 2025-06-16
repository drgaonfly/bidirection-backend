import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { handleWalletList } from './handleWalletList';
import createDebug from 'debug';

const reginoPageCallback = new Composer<MyContext>();
const debug = createDebug('bot:region:page');

reginoPageCallback.callbackQuery(/^wallet_page_\d+$/, async (ctx) => {
  const page = parseInt(ctx.callbackQuery.data.split('_')[2]);

  debug('wallet page', page);

  await ctx.deleteMessage();

  await handleWalletList(ctx, page);
});

export default reginoPageCallback;
