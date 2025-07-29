import { MyContext } from '../types';
import createDebug from 'debug';

const debug = createDebug('bot:checkInProxy');

export const checkInProxy = async (
  ctx: MyContext,
  next: () => Promise<void>,
) => {
  debug('checkInProxy');
  debug(ctx.chat);

  debug('当前botUser是否绑定过代理', ctx.currentBotUser.bound_proxy);

  // 绑定过代理的botUser
  if (!ctx.currentBotUser.bound_proxy) {
    debug('请在绑定过代理的botUser中使用此命令');
    ctx.reply('您没有绑定过代理，请先绑定代理');
    return;
  }

  await next();
};
