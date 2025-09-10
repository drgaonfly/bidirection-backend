import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import User from '../../../../models/user';

import createDebug from 'debug';

const getBotProxyCallback = new Composer<MyContext>();
const debug = createDebug('application:');

getBotProxyCallback.callbackQuery('get_bot_proxy', async (ctx) => {
  debug('get bot proxy');

  const user = await User.findById(ctx.currentBotUser.bound_proxy).select(
    '+plain_password',
  );

  const message = [
    `🔗 后台: <a>https://admin.trx-usdt.vip</a>`,
    ``,
    `👤 账号: <code>${user.email}</code>`,
    ``,
    `🔑 密码: <code>${user.plain_password}</code>`,
  ].join('\n');

  ctx.reply(message, {
    parse_mode: 'HTML',
  });
});

export default getBotProxyCallback;
