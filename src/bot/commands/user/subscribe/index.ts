import { Composer } from 'grammy';
import subscribeCommand from './subscribe';
import refreshCallback from './refresh';
import payCallback from './pay';
import checkCallback from './check';

const subscribeComposer = new Composer();

subscribeComposer.use(subscribeCommand.middleware());
subscribeComposer.use(refreshCallback.middleware());
subscribeComposer.use(payCallback.middleware());
subscribeComposer.use(checkCallback.middleware());

export default subscribeComposer;
