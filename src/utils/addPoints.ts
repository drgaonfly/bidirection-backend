import { IPackageOrder } from '../models/packageOrder';
import Rental, { IRental } from '../models/rental';
import { findBotProxy } from '../services/findBotProxy';
import { setupBot } from '../bot/botSetup';
import BotUserConfig from '../models/botUserConfig';
import Integer from '../models/integer';
import Bot from '../models/bot';

export async function awardUserPoints(
  botId,
  botUserId,
  amount: number,
  order: IPackageOrder,
) {
  await Integer.create({
    bot: botId,
    botUser: botUserId,
    amount: amount,
    type: 'PackageOrder',
    integrable: order,
  });

  await BotUserConfig.findOneAndUpdate(
    {
      bot: botId,
      botUser: botUserId,
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

  const bot = await Bot.findById(botId);

  const botUser = await BotUserConfig.findById(botUserId);

  const telegramBot = await setupBot(bot.token);

  // 发送信息
  try {
    await telegramBot.api.sendMessage(
      botUser.id,
      [`您在笔数套餐交易中获取到了 ${amount} 个积分, 请查看个人信息`].join(
        '\n',
      ),
      {
        parse_mode: 'HTML',
      },
    );
  } catch (error) {
    console.error('发送消息失败:', error);
  }
}

// 抽象成一个方法
export async function awardProxyPoints(
  botId: any,
  pens: number,
  order: IPackageOrder | IRental,
  level: number = 0,
) {
  // 级别对应的积分比例
  const ratios = [0.5, 0.3, 0.1];
  if (!botId || level >= ratios.length) return;

  const bot = await Bot.findById(botId);
  if (!bot) return;

  console.log('[awardProxyPoints]', bot.token);

  const telegramBot = await setupBot(bot.token);

  const proxy = await findBotProxy(bot);
  if (proxy && proxy.proxyBotUser) {
    await BotUserConfig.findByIdAndUpdate(proxy.proxyBotUserConfig._id, {
      $inc: {
        point: pens * ratios[level],
      },
    });

    const integer = await Integer.create({
      bot: bot._id,
      botUser: proxy.proxyBotUser,
      amount: pens * ratios[level],
      type: order instanceof Rental ? 'Rental' : 'PackageOrder',
      integrable: order._id,
    });

    // 发送信息
    try {
      await telegramBot.api.sendMessage(
        proxy.proxyBotUser.id,
        [
          `您在${
            integer.type === 'Rental' ? '闪租' : '笔数套餐'
          }交易中获取到了 ${pens * ratios[level]} 个积分, 请查看个人信息`,
        ].join('\n'),
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }

  if (bot.clonedFrom) {
    await awardProxyPoints(bot.clonedFrom, pens, order, level + 1);
  }
}
