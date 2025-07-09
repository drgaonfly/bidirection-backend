import { Composer } from 'grammy';
import membershipCommand from './membership';

// 创建一个新的 Composer 实例
const membershipComposer = new Composer();

membershipComposer.use(membershipCommand.middleware());

export default membershipComposer;
