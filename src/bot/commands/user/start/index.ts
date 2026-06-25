import { Composer } from 'grammy';
import startCommand from './start';
import configMenuComposer from './config';
import viewMediasComposer from './viewMedias';
import viewMessageComposer from './viewMessage';
import viewButtonsComposer from './viewButtons';
import previewFullComposer from './previewFull';

// 创建一个新的 Composer 实例
const startComposer = new Composer();

startComposer.use(startCommand.middleware());
startComposer.use(configMenuComposer.middleware());
startComposer.use(viewMediasComposer.middleware());
startComposer.use(viewMessageComposer.middleware());
startComposer.use(viewButtonsComposer.middleware());
startComposer.use(previewFullComposer.middleware());

export default startComposer;
