import { Composer } from 'grammy';
import showCommand from './show';
import handleTokenComposer from './handleToken';

const cloneComposer = new Composer();

cloneComposer.use(showCommand.middleware());
cloneComposer.use(handleTokenComposer.middleware());

export default cloneComposer;
