import { Composer } from 'grammy';
import cloneConversation from './clone';
import editMessageComposer from './editMessage';

const conversationsComposer = new Composer();

conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(editMessageComposer.middleware());

export default conversationsComposer;
