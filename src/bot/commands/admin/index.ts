// src/composers/index.ts
import { Composer } from 'grammy';
import banUserComposer from './banUser';
import callbackComposer from './callback';

// 创建一个新的 Composer 实例
const adminComposer = new Composer();

adminComposer.use(banUserComposer.middleware());
adminComposer.use(callbackComposer.middleware());

export default adminComposer;
