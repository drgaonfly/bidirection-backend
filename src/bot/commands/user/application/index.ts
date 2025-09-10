import { Composer } from 'grammy';
import applicationCommand from './application';
import getBotProxyCallback from './getBotProxy';

// 创建一个新的 Composer 实例
const applicationComposer = new Composer();

applicationComposer.use(applicationCommand.middleware());
applicationComposer.use(getBotProxyCallback.middleware());

export default applicationComposer;
