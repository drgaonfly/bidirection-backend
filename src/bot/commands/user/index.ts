// src/composers/index.ts
import { Composer } from 'grammy';
import startComposer from './help';
import helpComposer from './start';
import callbackComposer from './callback';

// 创建一个新的 Composer 实例
const userComposer = new Composer();

userComposer.use(startComposer.middleware());
userComposer.use(helpComposer.middleware());
userComposer.use(callbackComposer.middleware());

export default userComposer;
