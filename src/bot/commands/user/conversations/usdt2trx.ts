import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Wallet from '../../../../models/wallet';
import createDebug from 'debug';
import { getUSDTTransfers } from '../../../../tasks/cron/checkTrx';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { IBot } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';

const exchangeUsdtToTrxComposer = new Composer<MyContext>();
const debug = createDebug('bot:exchange:usdt_to_trx');

const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout

const cancelKeyboard = new InlineKeyboard().text('返回', 'exchange_flash');

async function usdtToTrxExchangeConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot, botUser }: { bot: IBot; botUser: IBotUser },
) {
  debug('Starting USDT to TRX exchange conversation');

  const wallets = await Wallet.find({
    botUser: botUser._id,
    bot: bot._id,
  });

  const trx_balance = wallets.reduce((acc, wallet) => acc + wallet.balance, 0);
  const transfers = await getUSDTTransfers(botUser.id);
  const usdt_balance = transfers.reduce(
    (acc, transfer) => acc + transfer.money,
    0,
  );

  const message = [
    '请输入要兑换的USDT金额：',
    '',
    `当前TRX余额：${trx_balance}`,
    `当前USDT余额：${usdt_balance}`,
    '',
    '⏳ 此操作将在 5 分钟后过期',
  ].join('\n');

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: cancelKeyboard,
  });

  const conversationResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  if (conversationResult.callbackQuery?.data === 'exchange_flash') {
    debug('User cancelled exchange');
    await ctx.reply('已取消兑换');
    return;
  }

  const { message: userMessage } = conversationResult;
  const amount = parseFloat(userMessage?.text || '');

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ 请输入有效的金额');
    return;
  }

  if (amount > usdt_balance) {
    await ctx.reply('❌ USDT余额不足');
    return;
  }

  // TODO: 这里添加实际的兑换逻辑
  await ctx.reply(`✅ 已收到兑换请求：${amount} USDT\n处理中...`);
}

exchangeUsdtToTrxComposer.use(
  createConversation(usdtToTrxExchangeConversation),
);

exchangeUsdtToTrxComposer.callbackQuery('usdt_to_trx', async (ctx) => {
  debug('usdt_to_trx callback triggered');
  await ctx.conversation.enter('usdtToTrxExchangeConversation', {
    bot: ctx.currentBot,
    botUser: ctx.currentBotUser,
  });
});

export default exchangeUsdtToTrxComposer;
