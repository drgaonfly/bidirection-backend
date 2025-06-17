import { Composer } from 'grammy';
import cloneConversation from './clone';
import addAddressConversation from './addWallte';
import setWalletConversation from './setWallet';
import usdtToTrxExchangeConversation from './usdt2trx';
import trxToUsdtExchangeConversation from './trx2usdt';

const conversationsComposer = new Composer();

conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(addAddressConversation.middleware());
conversationsComposer.use(setWalletConversation.middleware());
conversationsComposer.use(usdtToTrxExchangeConversation.middleware());
conversationsComposer.use(trxToUsdtExchangeConversation.middleware());

export default conversationsComposer;
