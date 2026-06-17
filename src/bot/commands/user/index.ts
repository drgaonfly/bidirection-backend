// src/composers/index.ts
import { Composer } from 'grammy';
import startComposer from './start';
import helpComposer from './help';
import contactComposer from './contact';
// import profileComposer from './profile';
import cloneComposer from './clone';
// import walletComposer from './wallet';
// import exchangeComposer from './exchange';
import rechargeComposer from './recharge';

import conversationsComposer from './conversations';

// 创建一个新的 Composer 实例
const userComposer = new Composer();

userComposer.use(startComposer.middleware());
userComposer.use(helpComposer.middleware());

// 在机器人使用的
userComposer.use(contactComposer.middleware());
userComposer.use(cloneComposer.middleware());
userComposer.use(rechargeComposer.middleware());
userComposer.use(conversationsComposer.middleware());

export default userComposer;
