// src/composers/index.ts
import { Composer } from 'grammy';
import setExchangeRateCommand from './exchangeRate';
import setFeeRateCommand from './feeRate';

// 创建一个新的 Composer 实例
const setComposer = new Composer();

setComposer.use(setExchangeRateCommand.middleware());
setComposer.use(setFeeRateCommand.middleware());

export default setComposer;
