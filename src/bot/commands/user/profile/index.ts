// src/composers/index.ts
import { Composer } from 'grammy';
import meCommand from './me';
// import subscriptionHistoryCallback from './subscriptionHistory';
import rechargeHistoryCallback from './rechargeHistory';

// 创建一个新的 Composer 实例
const profileComposer = new Composer();

profileComposer.use(meCommand.middleware());
// profileComposer.use(subscriptionHistoryCallback.middleware());
profileComposer.use(rechargeHistoryCallback.middleware());

export default profileComposer;
