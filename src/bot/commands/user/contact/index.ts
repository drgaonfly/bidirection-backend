import { Composer } from 'grammy';
import contactCommand from './contact';
import contactCallback from './callback';
// 创建一个新的 Composer 实例
const contactComposer = new Composer();

contactComposer.use(contactCommand.middleware());
contactComposer.use(contactCallback.middleware());

export default contactComposer;
