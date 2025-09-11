import { Composer } from 'grammy';
import membershipCommand from './membership';
import cancelStarCommand from './cancelStar';
import cancelPremiumCommand from './cancelPremium';

// 创建一个新的 Composer 实例
const membershipComposer = new Composer();

membershipComposer.use(membershipCommand.middleware());
membershipComposer.use(cancelStarCommand.middleware());
membershipComposer.use(cancelPremiumCommand.middleware());

export default membershipComposer;
