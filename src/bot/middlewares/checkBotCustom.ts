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
  console.log('ctx.currentBot', ctx.currentBot);

  // const bot = ctx.currentBot;
  // debug('bot', bot);
  // const userId = ctx.currentBotUser._id.toString();

  // // 检查是否为 owner 或 authorized_user
  // // 只允许 custom 类型
  // if (bot.type !== 'custom') {
  //   debug('该功能仅对定制机器人开放');
  //   // ctx.reply('该功能仅对定制机器人开放');
  //   return await next();
  // }

  // // owners 和 authorized_users 可能是 ObjectId 或 IBotUser，需要统一取出 id 字符串
  // const ownerId = bot.owner ? bot.owner.toString() : null;
  // const authorizedUsers: string[] = (bot.authorized_users || []).map(
  //   (user: any) => user.toString(),
  // );

  // if (ownerId !== userId && !authorizedUsers.includes(userId)) {
  //   debug('仅限机器人拥有者或授权用户使用');
  //   ctx.reply('该功能仅对定制机器人开放, 仅限机器人拥有者或授权用户使用');
  //   return;
  // }

  await next();
};
