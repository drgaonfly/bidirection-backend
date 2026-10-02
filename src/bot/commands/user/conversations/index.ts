import { Composer } from 'grammy';
import editMessageComposer from './editMessage';
import editMediasComposer from './editMedias';
import editButtonsComposer from './editButtons';
import cloneConversationComposer from './clone';

const conversationsComposer = new Composer();

// clone_start 回调只发流程说明，实际克隆由 clone/handleToken 的 hears 接管
conversationsComposer.use(cloneConversationComposer.middleware());
conversationsComposer.use(editMessageComposer.middleware());
conversationsComposer.use(editMediasComposer.middleware());
conversationsComposer.use(editButtonsComposer.middleware());

export default conversationsComposer;
