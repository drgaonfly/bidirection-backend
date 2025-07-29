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
    ctx.reply('您不是代理, 须先申请成为代理, 才能使用此功能');
    return;
  }

  await next();
};
