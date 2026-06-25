import { Composer } from 'grammy';
import cloneConversation from './clone';
import editMessageComposer from './editMessage';
import editMediasComposer from './editMedias';
import editButtonsComposer from './editButtons';

const conversationsComposer = new Composer();

conversationsComposer.use(cloneConversation.middleware());
conversationsComposer.use(editMessageComposer.middleware());
conversationsComposer.use(editMediasComposer.middleware());
conversationsComposer.use(editButtonsComposer.middleware());

export default conversationsComposer;
