import { Composer } from 'grammy';
import anynoumyCommand from './anyoumy';
import confirmCallback from './confirm';

// 创建一个新的 Composer 实例
const anynoumyComposer = new Composer();

anynoumyComposer.use(anynoumyCommand.middleware());
anynoumyComposer.use(confirmCallback.middleware());

export default anynoumyComposer;
