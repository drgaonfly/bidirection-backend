import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import axios from 'axios';
import createDebug from 'debug';
import { fetchTrxUsdtPrice } from './realtiem';

const exchangeFlashComposer = new Composer<MyContext>();

const debug = createDebug('bot:exchange:flash');

// 弃用
exchangeFlashComposer.callbackQuery('exchange_flash', async (ctx) => {
  await ctx.conversation.exitAll();

  const price = await fetchTrxUsdtPrice();

  const trx_balance = ctx.currentBotUserConfig.trx_balance;

  const usdt_balance = ctx.currentBotUserConfig.usdt_balance;

  const message = [
    `💱 闪兑 💰🔛💰`,
    '\n',
    `100 USDT ≈ ${price * 100} TRX`,
    `100 TRX ≈ ${100 / price} USDT`,
    '\n',
    '<b>自动兑换地址</b>',
    `<code>${
      ctx.currentBot.auto_exchange_address || '请在后台设置机器人收款地址'
    }</code>(点击地址自动复制)`,
    '----------------------------------------',
    '我当前的余额信息：',
    `💰 USDT: ${usdt_balance.toFixed(4)}`,
    `💰 TRX: ${trx_balance.toFixed(4)}`,
  ].join('\n');

  const inline_menu = new InlineKeyboard()
    .text('USDT兑换TRX', 'usdt_to_trx')
    .text('TRX兑换USDT', 'trx_to_usdt')
    .row()
    .text('🏠 主菜单', 'exchange_show');

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: inline_menu,
  });
});

export default exchangeFlashComposer;
