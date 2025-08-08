import { Middleware } from 'grammy';
import { MyContext } from '../types';
import createDebug from 'debug';
import User from '../../models/user';
import BotUser from '../../models/botUser';
import BotUserConfig from '../../models/botUserConfig';
// import { startClientAndGetSession } from '../services/gramClient';

const debug = createDebug('bot:Resolver');

const proxyResolver: Middleware<MyContext> = async (ctx, next) => {
  const currentBot = ctx.currentBot;

  // 平台机器人
  // 如果是平台机器人，就退出
  if (currentBot.isCreatedByAdmin) {
    debug('平台机器人');
    ctx.currentProxyUser = null;
    ctx.currentProxyBotUser = null;
    ctx.currentProxyBotUserConfig = null;
    return await next();
  }

  if (!currentBot.user) {
    debug('没有用户');
    ctx.currentProxyUser = null;
    ctx.currentProxyBotUser = null;
    ctx.currentProxyBotUserConfig = null;
    return await next();
  }

  const currentProxy = await User.findOne({
    _id: currentBot.user,
  });

  const currentProxyBotUser = await BotUser.findOne({
    _id: currentBot.botUser,
  });

  const currentProxyBotUserConfig = await BotUserConfig.findOne({
    bot: currentBot?._id,
    botUser: currentProxyBotUser?._id,
  });

  // 找不到代理
  if (!currentProxy) {
    debug('找不到代理');
    ctx.currentProxyUser = null;
    ctx.currentProxyBotUser = null;
    ctx.currentProxyBotUserConfig = null;
    return await next();
  }

  // 附加到上下文
  ctx.currentProxyUser = currentProxy;
  ctx.currentProxyBotUser = currentProxyBotUser;
  ctx.currentProxyBotUserConfig = currentProxyBotUserConfig;

  // 继续处理后续中间件
  await next();
};

export default proxyResolver;
