import { Composer } from 'grammy';
import displayCallback from './display';
import balanceCallback from './balance';
import recordCallback from './record';

// 创建一个新的 Composer 实例
const packageOrderComposer = new Composer();

packageOrderComposer.use(recordCallback.middleware());
packageOrderComposer.use(balanceCallback.middleware());
packageOrderComposer.use(displayCallback.middleware());

export default packageOrderComposer;
