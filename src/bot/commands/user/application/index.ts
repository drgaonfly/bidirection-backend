import { Composer } from 'grammy';
import applicationCommand from './application';

// 创建一个新的 Composer 实例
const applicationComposer = new Composer();

applicationComposer.use(applicationCommand.middleware());

export default applicationComposer;
