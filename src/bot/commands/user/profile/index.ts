// src/composers/index.ts
import { Composer } from 'grammy';
import meCommand from './me';

// 创建一个新的 Composer 实例
const profileComposer = new Composer();

profileComposer.use(meCommand.middleware());

export default profileComposer;
