// src/composers/index.ts
import { Composer } from 'grammy';
import exchangeShowComposer from './show';
import exchangeFlashComposer from './flash';
import exchangeTransferComposer from './transfer';

// 创建一个新的 Composer 实例
const exchangeComposer = new Composer();

exchangeComposer.use(exchangeShowComposer.middleware());
exchangeComposer.use(exchangeFlashComposer.middleware());
exchangeComposer.use(exchangeTransferComposer.middleware());

export default exchangeComposer;
