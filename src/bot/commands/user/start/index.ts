import { Composer } from 'grammy';
import startCommand from './start';

const startComposer = new Composer();

startComposer.use(startCommand.middleware());

export default startComposer;
