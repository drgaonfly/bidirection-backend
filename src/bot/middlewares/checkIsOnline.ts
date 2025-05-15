import { MyContext } from '../types';
import createDebug from 'debug';

const debug = createDebug('bot:checkIsOnline');

export const checkIsOnline = async (
  ctx: MyContext,
  next: () => Promise<void>,
) => {
  if (!ctx.currentGroup.isOnline) {
    debug('该群组未设置开始');
    ctx.reply('该群组未设置开始');
    // ctx.reply('请在群组中使用此命令');
    return;
  } else {
    await next();
  }
};
