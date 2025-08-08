import { Middleware } from 'grammy';
import { MyContext } from '../types';
import createDebug from 'debug';
import User from '../../models/user';
import BotUser from '../../models/botUser';
import BotUserConfig from '../../models/botUserConfig';
// import { startClientAndGetSession } from '../services/gramClient';

const debug = createDebug('botProxy:Resolver');

const proxyResolver: Middleware<MyContext> = async (ctx, next) => {
  const currentBot = ctx.currentBot;

  // 平台机器人
  // 如果是平台机器人，就退出
  if (currentBot.isCreatedByAdmin) {
    debug('平台机器人');
    return await next();
  }

  // 代理后台用户
  const currentProxyUser = await User.findOne({
    _id: currentBot?.user,
  });
  // 找不到代理
  if (!currentProxyUser) {
    debug('找不到代理');
  }
  ctx.currentProxyUser = currentProxyUser;

  // 代理机器人用户
  const currentProxyBotUser = await BotUser.findOne({
    _id: currentBot.botUser,
  });
  ctx.currentProxyBotUser = currentProxyBotUser;
  if (!currentProxyBotUser) {
    debug('找不到代理机器人');
  }

  // 代理机器人用户配置
  const currentProxyBotUserConfig = await BotUserConfig.findOne({
    bot: currentBot._id,
    botUser: currentProxyBotUser?._id,
  });
  ctx.currentProxyBotUserConfig = currentProxyBotUserConfig;
  if (!currentProxyBotUserConfig) {
    debug('找不到代理机器人配置');
  }

  // 继续处理后续中间件
  await next();
};

export default proxyResolver;
