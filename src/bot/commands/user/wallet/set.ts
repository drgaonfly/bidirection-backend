import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { handleWalletList } from './handleWalletList';
import createDebug from 'debug';

const walletSetComposer = new Composer<MyContext>();

const debug = createDebug('bot:wallet:set');

walletSetComposer.callbackQuery('wallet_set_address', async (ctx) => {
  debug('wallet_set_address');

  await handleWalletList(ctx);
});

export default walletSetComposer;
