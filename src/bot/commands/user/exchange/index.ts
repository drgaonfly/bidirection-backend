// src/composers/index.ts
import { Composer } from 'grammy';
import exchangeFlashComposer from './flash';
import exchangeShowComposer from './show';

// 创建一个新的 Composer 实例
const exchangeComposer = new Composer();

exchangeComposer.use(exchangeFlashComposer.middleware());
exchangeComposer.use(exchangeShowComposer.middleware());

export default exchangeComposer;
