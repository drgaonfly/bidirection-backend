import { IBotUser } from '../../models/botUser';
import { IBot } from '../../models/bot';
import { IBotUserConfig, UserStatus } from '../../models/botUserConfig';
import { MyContext } from '../types';
import createDebug from 'debug';

const debug = createDebug('bot:checkBillPermission');

// 检查用户是否有权限使用机器人
const checkUserPermission = (
  bot: IBot,
  botUser: IBotUser,
  botUserConfig: IBotUserConfig,
): boolean => {
  if (botUser.isAuthorized) return true;

  // 检查是否在试用期内
  if (botUserConfig.status === UserStatus.TRIAL && botUserConfig.trialEndDate) {
    const now = new Date();
    if (now < new Date(botUserConfig.trialEndDate)) {
      return true;
    }
  }

  return false;
};

export const checkBillPermission = async (
  ctx: MyContext,
  next: () => Promise<void>,
) => {
  debug('checkBillPermission');
  const botUser = ctx.currentBotUser;
  const bot = ctx.currentBot;
  const botUserConfig = ctx.currentBotUserConfig;

  if (!ctx.chat || ctx.chat.type !== 'private') {
    debug('在群里使用机器人');

    if (checkUserPermission(bot, botUser, botUserConfig)) {
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
