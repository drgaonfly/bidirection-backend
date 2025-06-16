import { Composer } from 'grammy';
import cloneConversation from './clone';
import addAddressConversation from './addWallte';
import setWalletConversation from './setWallet';

const conversationsComposer = new Composer();

conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(addAddressConversation.middleware());
conversationsComposer.use(setWalletConversation.middleware());

export default conversationsComposer;
