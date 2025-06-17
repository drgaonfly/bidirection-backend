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

  let isValidInput = false;
  while (!isValidInput) {
    const wallets = await Wallet.find({
      botUser: botUser._id,
      bot: bot._id,
    });

    const trx_balance = wallets.reduce(
      (acc, wallet) => acc + wallet.balance,
      0,
    );
    const transfers = await Promise.all(
      wallets.map(async (wallet) => await getUSDTTransfers(wallet.address)),
    );
    const usdt_balance = transfers
      .flat()
      .reduce((acc, transfer) => acc + transfer.money, 0);

    const message = [
      '请输入要兑换的USDT金额：',
      '',
      `当前TRX余额：${trx_balance}`,
      `当前USDT余额：${usdt_balance}`,
      '',
      '⏳ 此操作将在 5 分钟后过期',
    ].join('\n');

    await ctx
      .editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard,
      })
      .catch(() => {
        // 如果编辑失败（消息可能已被删除），则发送新消息
        return ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: cancelKeyboard,
        });
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
      await ctx.reply('❌ 请输入有效的金额\n请重新输入', {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard,
      });
      continue;
    }

    if (amount > usdt_balance) {
      await ctx.reply(
        `❌ USDT余额不足\n当前余额：${usdt_balance} USDT\n请重新输入`,
        {
          parse_mode: 'HTML',
          reply_markup: cancelKeyboard,
        },
      );
      continue;
    }

    // 输入有效且余额充足，显示确认信息
    const confirmMessage = [
      '请确认兑换信息：',
      '',
      `兑换金额：${amount} USDT`,
      `当前余额：${usdt_balance} USDT`,
      '',
      '请点击确认继续，或返回重新输入',
    ].join('\n');

    const confirmKeyboard = new InlineKeyboard()
      .text('✅ 确认', 'confirm_exchange')
      .row()
      .text('返回重输', 'retry_input')
      .row()
      .text('取消', 'exchange_flash');

    await ctx.reply(confirmMessage, {
      parse_mode: 'HTML',
      reply_markup: confirmKeyboard,
    });

    const confirmResult = await conversation.waitFor(['callback_query:data'], {
      maxMilliseconds: TIMEOUT,
    });

    if (confirmResult.callbackQuery?.data === 'exchange_flash') {
      debug('User cancelled exchange at confirmation');
      await ctx.reply('已取消兑换');
      return;
    }

    if (confirmResult.callbackQuery?.data === 'retry_input') {
      debug('User chose to retry input');
      continue;
    }

    if (confirmResult.callbackQuery?.data === 'confirm_exchange') {
      // TODO: 这里添加实际的兑换逻辑
      await ctx.reply(`✅ 已收到兑换请求：${amount} USDT\n处理中...`);
      isValidInput = true;
    }
  }
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
