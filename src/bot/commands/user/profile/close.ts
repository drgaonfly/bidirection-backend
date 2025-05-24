import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

const closeCallback = new Composer<MyContext>();
const debug = createDebug('bot:cancel-profile');

closeCallback.callbackQuery('close', async (ctx) => {
  debug('关闭个人信息');

  await ctx.deleteMessage(); // 删除当前消息

  await ctx.answerCallbackQuery('个人信息已关闭');
});

export default closeCallback;
