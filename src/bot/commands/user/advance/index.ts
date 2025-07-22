import { Composer } from 'grammy';
import advanceCommand from './advance';

// 创建一个新的 Composer 实例
const advanceComposer = new Composer();

advanceComposer.use(advanceCommand.middleware());

export default advanceComposer;
