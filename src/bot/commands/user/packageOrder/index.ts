import { Composer } from 'grammy';
import displayCallback from './display';
import balanceCallback from './balance';
import recordCallback from './record';
import usageCallack from './usages';

// 创建一个新的 Composer 实例
const packageOrderComposer = new Composer();

packageOrderComposer.use(recordCallback.middleware());
packageOrderComposer.use(balanceCallback.middleware());
packageOrderComposer.use(displayCallback.middleware());
packageOrderComposer.use(usageCallack.middleware());

export default packageOrderComposer;
