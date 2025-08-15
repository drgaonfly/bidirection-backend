import { Composer } from 'grammy';
import recordCallback from './record';
import balanceCallback from './balance';

// 创建一个新的 Composer 实例
const packageOrderComposer = new Composer();

packageOrderComposer.use(recordCallback.middleware());
packageOrderComposer.use(balanceCallback.middleware());

export default packageOrderComposer;
