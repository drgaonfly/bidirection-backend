import { Composer } from 'grammy';
import cloneConversation from './clone';

const cloneComposer = new Composer();

cloneComposer.use(cloneConversation.middleware());

export default cloneComposer;
