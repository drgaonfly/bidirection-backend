import { MyContext } from '../types';
import createDebug from 'debug';

const debug = createDebug('bot:checkBotCustom');

/**
 * 仅允许定制机器人（custom）类型，且用户必须是 owner 或 authorized_user
 */
export const checkBotCustom = async (
  ctx: MyContext,
  next: () => Promise<void>,
) => {
  debug('checkBotCustom');

  const bot = ctx.currentBot;
  debug('bot', bot);
  const userId = ctx.currentBotUser.id;

  // 检查是否为 owner 或 authorized_user
  // 只允许 custom 类型
  if (bot.type !== 'custom') {
    debug('该功能仅对定制机器人开放');
    // ctx.reply('该功能仅对定制机器人开放');
    return await next();
  }

  const owners: string[] = Array.isArray(bot.owners) ? bot.owners : [];
  const authorizedUsers: string[] = Array.isArray(bot.authorized_users)
    ? bot.authorized_users
    : [];

  if (!owners.includes(userId) && !authorizedUsers.includes(userId)) {
    debug('仅限机器人拥有者或授权用户使用');
    ctx.reply('该功能仅对定制机器人开放, 仅限机器人拥有者或授权用户使用');
    return;
  }

  await next();
};
