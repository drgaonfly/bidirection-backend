import { Composer } from 'grammy';
import showCommand from './show';
import closeCommand from './close';
import setCommand from './set';
import paginationCommand from './pagination';
import deleteCommand from './delete';

const walletComposer = new Composer();

walletComposer.use(showCommand.middleware());
walletComposer.use(closeCommand.middleware());
walletComposer.use(setCommand.middleware());
walletComposer.use(paginationCommand.middleware());
walletComposer.use(deleteCommand.middleware());

export default walletComposer;
