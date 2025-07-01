import { Composer } from 'grammy';
import showCommand from './show';

const cloneComposer = new Composer();

cloneComposer.use(showCommand.middleware());

export default cloneComposer;
