import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import axios from 'axios';
import createBug from 'debug';
import { fetchTrxUsdtPrice } from './realtiem';
const exchangeShowComposer = new Composer<MyContext>();

const debug = createBug('bot:exchange');

const handleShow = async (ctx: MyContext) => {
  if (!ctx.currentBot.fee) {
    await ctx.reply('机器人没有设置手续费，请在后台设置');
    return;
  }

  if (!ctx.currentBot.auto_exchange_address) {
    await ctx.reply('机器人没有设置自动兑换地址，请在后台设置');
    return;
  }

  const price = await fetchTrxUsdtPrice();

  debug(price);

  const realPrice = price * (1 - ctx.currentBot.fee / 100);

  const initialMessage = [
    `📈实时汇率`,
    `1 USDT = ${realPrice} TRX`,
    '\n',
    '<b>自动兑换地址</b>',
    `<code>${
      ctx.currentBot.auto_exchange_address || '请在后台设置机器人收款地址'
    }</code>(点击地址自动复制)`,
    '\n',
    '🚫请不要使用交易所或中心化钱包转账❗️切记‼️',
    '🏪转账即兑,全自动返,等值1U起兑，全网最高汇率',
    'U→TRX 即转即兑',
    '\n',
    '📌<b>请输入兑换数量,例如:"20U"</b>',
  ].join('\n');

  const inline_menu = new InlineKeyboard()
    .text('🔄 兑换给他人', 'exchange_to_others')
    .url(
      '大额联系老板',
      ctx.currentBot.customer_service_link || 'https://t.me/infoswqz',
    );

  await ctx.reply(initialMessage, {
    parse_mode: 'HTML',
    reply_markup: inline_menu,
  });
};

exchangeShowComposer.hears(/^💱 TRX 兑换$/, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleShow(ctx);
});

exchangeShowComposer.callbackQuery('exchange_show', async (ctx) => {
  await ctx.conversation.exitAll();
  await handleShow(ctx);
});

export default exchangeShowComposer;
