import { Composer } from 'grammy';

import separationCommand from '../separation/separation';

// 创建一个新的 Composer 实例
const separationComposer = new Composer();

separationComposer.use(separationCommand.middleware());

export default separationComposer;
