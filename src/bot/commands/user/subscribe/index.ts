import { Composer } from 'grammy';
import subscribeCallback from './subscribe';
import refreshCallback from './refresh';
import payCallback from './pay';
import checkCallback from './check';
import toggleCallback from './toggle';

const subscribeComposer = new Composer();

subscribeComposer.use(subscribeCallback.middleware());
subscribeComposer.use(refreshCallback.middleware());
subscribeComposer.use(payCallback.middleware());
subscribeComposer.use(checkCallback.middleware());
subscribeComposer.use(toggleCallback.middleware());

export default subscribeComposer;
