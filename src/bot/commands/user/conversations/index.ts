import { Composer } from 'grammy';
import cloneConversation from './clone';
import addAddressConversation from './addWallte';
import setWalletConversation from './setWallet';
// import usdtToTrxExchangeConversation from './usdt2trx';
// import trxToUsdtExchangeConversation from './trx2usdt';
import transferExchangeConversation from './transfer';
import customRechargeConversation from './customRecharge';
import packageOrderCallback from './rentalSep';
import membershipingCallback from './membership';
import tgStarsCallback from './tgStars';

const conversationsComposer = new Composer();

conversationsComposer.use(customRechargeConversation.middleware());
conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(addAddressConversation.middleware());
conversationsComposer.use(setWalletConversation.middleware());
// conversationsComposer.use(usdtToTrxExchangeConversation.middleware());
// conversationsComposer.use(trxToUsdtExchangeConversation.middleware());
conversationsComposer.use(transferExchangeConversation.middleware());
conversationsComposer.use(packageOrderCallback.middleware());
conversationsComposer.use(membershipingCallback.middleware());
conversationsComposer.use(tgStarsCallback.middleware());

export default conversationsComposer;
