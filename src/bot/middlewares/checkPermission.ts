import { IBotUser } from '../../models/botUser';
import { IBotUserConfig, UserStatus } from '../../models/botUserConfig';
import { MyContext } from '../types';
import createDebug from 'debug';
import { IGroup } from '../../models/group';

const debug = createDebug('bot:checkPermission');

// 检查用户是否有权限使用机器人
const checkUserPermission = (
  group: IGroup,
  botUser: IBotUser,
  botUserConfig: IBotUserConfig,
): boolean => {
  // 后台设置过的授权用户
  if (botUser.isAuthorized) return true;

  // 如果邀请进群的人也是授权用户
  if ((group.creator as IBotUser)?.isAuthorized) return true;

  // 如果是试用过期状态，不允许使用
  if (botUserConfig.status === UserStatus.TRIAL_EXPIRED) return false;

  // 检查是否在试用期内
  if (botUserConfig.status === UserStatus.TRIAL && botUserConfig.trialEndDate) {
    const now = new Date();
    if (now < new Date(botUserConfig.trialEndDate)) {
      return true;
    }
  }

  return false;
};

export const checkPermission = async (
  ctx: MyContext,
  next: () => Promise<void>,
) => {
  debug('checkBillPermission');
  const botUser = ctx.currentBotUser;
  const group = ctx.currentGroup;
  const botUserConfig = ctx.currentBotUserConfig;

  if (!ctx.chat || ctx.chat.type !== 'private') {
    debug('在群里使用机器人');

    if (!checkUserPermission(group, botUser, botUserConfig)) {
      ctx.reply('您没有权限或权限已过期，请打开机器人申请使用或联系客服授权', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '点击申请使用', url: `https://t.me/${ctx.me.username}` }],
          ],
        },
      });
      return;
    }
  }

  await next();
};
