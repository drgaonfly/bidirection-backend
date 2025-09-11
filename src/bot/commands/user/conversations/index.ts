import { Composer } from 'grammy';
import cloneConversation from './clone';
import addAddressConversation from './addWallte';
import setWalletConversation from './setWallet';

import transferExchangeConversation from './transfer';
import customRechargeConversation from './customRecharge';
import packageOrderCallback from './rentalSep';
import premiumCallback from './premium';
import starCallback from './star';
import usePackageCallback from './usePackage';

const conversationsComposer = new Composer();

conversationsComposer.use(customRechargeConversation.middleware());
conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(addAddressConversation.middleware());
conversationsComposer.use(setWalletConversation.middleware());
conversationsComposer.use(transferExchangeConversation.middleware());
conversationsComposer.use(packageOrderCallback.middleware());
conversationsComposer.use(premiumCallback.middleware());
conversationsComposer.use(starCallback.middleware());
conversationsComposer.use(usePackageCallback.middleware());

export default conversationsComposer;
