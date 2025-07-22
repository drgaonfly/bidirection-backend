import { Composer } from 'grammy';
import membershipCommand from './membership';
import buyStarsCommand from './buyStars';

// 创建一个新的 Composer 实例
const membershipComposer = new Composer();

membershipComposer.use(membershipCommand.middleware());
membershipComposer.use(buyStarsCommand.middleware());

export default membershipComposer;
