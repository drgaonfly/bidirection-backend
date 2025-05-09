import { Composer } from 'grammy';
import { MyContext } from '../../types';
import BotUser from '../../../models/botUser';
import createDebug from 'debug';

const setExchangeRateCommand = new Composer<MyContext>();

const debug = createDebug('bot:error');

// 处理设置汇率命令
setExchangeRateCommand.command('ex', async (ctx) => {
  debug('ex');
  // 发送长文本消息并附带 Inline Menu
  await ctx.reply('输入: 设置汇率3 或 设置汇率 3 的格式即可设置汇率');
});

setExchangeRateCommand.hears(/^(\/)?设置汇率\s*(\d+\.?\d*)$/, async (ctx) => {
  const exchangeRate = ctx.match[2];
  if (!exchangeRate) {
    await ctx.reply(
      '请使用正确的格式：/设置汇率 <汇率>\n例如: /设置汇率 6.8 或 /汇率6.8',
    );
    return;
  }
  await BotUser.findOneAndUpdate(
    {
      id: ctx.from?.id.toString(),
    },
    {
      exchange_rate: exchangeRate,
    },
    { upsert: true },
  );

  await ctx.reply(`汇率已成功设置为 ${exchangeRate}%`);
});

export default setExchangeRateCommand;
