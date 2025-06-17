// src/composers/index.ts
import { Composer } from 'grammy';
import exchangeShowComposer from './show';
import exchangeFlashComposer from './flash';

// 创建一个新的 Composer 实例
const exchangeComposer = new Composer();

exchangeComposer.use(exchangeShowComposer.middleware());
exchangeComposer.use(exchangeFlashComposer.middleware());

export default exchangeComposer;
