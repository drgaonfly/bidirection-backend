import { Composer } from 'grammy';
import cloneConversation from './clone';
import editMessageComposer from './editMessage';
import editAdvertisementComposer from './editAdvertisement';

const conversationsComposer = new Composer();

conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(editMessageComposer.middleware());
conversationsComposer.use(editAdvertisementComposer.middleware());

export default conversationsComposer;
