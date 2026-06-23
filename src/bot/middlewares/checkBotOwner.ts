import { MyContext } from '../types';
import { isBotOwner } from '../commands/user/subscribe/helpers';

/**
 * checkBotOwner 中间件
 *
 * 验证当前用户是否是机器人的 owner，不是则拦截并回复错误提示。
 * 适用于只有 owner 才能操作的命令或 callback。
 *
 * 用法：
 *   composer.command('cmd', checkBotOwner, async (ctx) => { ... })
 *   composer.callbackQuery('cb', checkBotOwner, async (ctx) => { ... })
 */
export const checkBotOwner = async (
  ctx: MyContext,
  next: () => Promise<void>,
): Promise<void> => {
  if (!(await isBotOwner(ctx))) {
    // callback query 需要先 answer 再提示，否则 Telegram 会一直转圈
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: '❌ 只有机器人拥有者才能执行此操作',
        show_alert: true,
      });
    } else {
      await ctx.reply('❌ 只有机器人拥有者才能执行此操作');
    }
    return;
  }
  await next();
};
