import { IPackageOrder } from '../models/packageOrder';
import { findBotProxy } from '../services/findBotProxy';
import BotUserConfig from '../models/botUserConfig';
import Integer from '../models/integer';
import Bot from '../models/bot';

export async function awardUserPoints(
  bot,
  botUser,
  amount: number,
  order: IPackageOrder,
) {
  await Integer.create({
    bot: bot,
    botUser: botUser,
    amount: amount,
    type: 'PackageOrder',
    integrable: order,
  });

  await BotUserConfig.findOneAndUpdate(
    {
      bot: bot,
      botUser: botUser,
    },
    {
      $inc: {
        point: amount,
      },
    },
    {
      new: true,
    },
  );
}

// 抽象成一个方法
export async function awardProxyPoints(
  botId: any,
  pens: number,
  order: IPackageOrder,
  level: number = 0,
) {
  // 级别对应的积分比例
  const ratios = [0.5, 0.3, 0.1];
  if (!botId || level >= ratios.length) return;

  const bot = await Bot.findById(botId);
  if (!bot) return;

  const proxy = await findBotProxy(bot);
  if (proxy && proxy.proxyBotUser) {
    await BotUserConfig.findByIdAndUpdate(proxy.proxyBotUserConfig._id, {
      $inc: {
        point: pens * ratios[level],
      },
    });

    await Integer.create({
      bot: bot._id,
      botUser: proxy.proxyBotUser,
      amount: pens * ratios[level],
      type: 'PackageOrder',
      integrable: order._id,
    });
  }

  if (bot.clonedFrom) {
    await awardProxyPoints(bot.clonedFrom, pens, order, level + 1);
  }
}
