import { Composer } from 'grammy';
import rentalCommand from './rental';
import rentalByTimesCommand from './callback/rentalByTimes';
import confirmRentalCommand from './callback/confirm';
import balanceRentalCommand from './callback/balance';

// 创建一个新的 Composer 实例
const rentalComposer = new Composer();

rentalComposer.use(rentalCommand.middleware());
rentalComposer.use(rentalByTimesCommand.middleware());
rentalComposer.use(confirmRentalCommand.middleware());
rentalComposer.use(balanceRentalCommand.middleware());

export default rentalComposer;
