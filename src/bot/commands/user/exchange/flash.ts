import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import axios from 'axios';
import Wallet from '../../../../models/wallet';
import createDebug from 'debug';
import { getUSDTTransfers } from '../../../../tasks/cron/checkTrx';

const exchangeFlashComposer = new Composer<MyContext>();

const debug = createDebug('bot:exchange:flash');

exchangeFlashComposer.callbackQuery('exchange_flash', async (ctx) => {
  await ctx.conversation.exitAll();

  const response = await axios.get(
    'https://openapi.sun.io/v2/allpairs?page_size=1&page_num=0&token_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&orderBy=price',
  );

  debug(response.data);

  const result = response.data.data['0_TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'];

  const wallets = await Wallet.find({
    botUser: ctx.currentBotUser._id,
    bot: ctx.currentBot._id,
  });

  const trx_balance = wallets.reduce((acc, wallet) => acc + wallet.balance, 0);

  const transfers = await Promise.all(
    wallets.map(async (wallet) => await getUSDTTransfers(wallet.address)),
  );

  // 先将所有钱包的转账记录展平，然后计算总金额
  const usdt_balance = transfers
    .flat()
    .reduce((acc, transfer) => acc + transfer.money, 0);

  const message = [
    `💱 闪兑 💰🔛💰`,
    '\n',
    `100 USDT ≈ ${result.price * 100} TRX`,
    `100 TRX ≈ ${100 / result.price} USDT`,
    '\n',
    '<b>自动兑换地址</b>',
    `<code>${result.base_id}</code>(点击地址自动复制)`,
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
