import { Composer } from 'grammy';
import subscribeCallback from './subscribe';
import refreshCallback from './refresh';
import payCallback from './pay';
import checkCallback from './check';

const subscribeComposer = new Composer();

subscribeComposer.use(subscribeCallback.middleware());
subscribeComposer.use(refreshCallback.middleware());
subscribeComposer.use(payCallback.middleware());
subscribeComposer.use(checkCallback.middleware());

export default subscribeComposer;
