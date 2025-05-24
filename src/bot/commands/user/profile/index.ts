// src/composers/index.ts
import { Composer } from 'grammy';
import meCommand from './me';
import subscriptionHistoryCallback from './subscriptionHistory';
import closeCallback from './close';
import contact from './contact';

// 创建一个新的 Composer 实例
const profileComposer = new Composer();

profileComposer.use(meCommand.middleware());
profileComposer.use(contact.middleware());
profileComposer.use(closeCallback.middleware());
profileComposer.use(subscriptionHistoryCallback.middleware());

export default profileComposer;
