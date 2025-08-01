import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { IdGen } from '../../../../utils/idGen';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { IBotUserConfig } from '../../../../models/botUserConfig';
import { sendTRX } from '../../../../utils/sendTRX';
import Exchange from '../../../../models/exchange';
import createDebug from 'debug';

const exchangeTrxToUsdtComposer = new Composer<MyContext>();
const debug = createDebug('bot:exchange:trx_to_usdt');

const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout

const returnKeyboard = new InlineKeyboard().text('返回', 'exchange_flash');

const cancelKeyboard = new InlineKeyboard().text('❌ 取消', 'close');

async function trxToUsdtExchangeConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    botUserConfig,
    private_key,
  }: {
    botUserConfig: IBotUserConfig;
    private_key: string;
  },
) {
  debug('Starting TRX to USDT exchange conversation');

  const trx_balance = botUserConfig.trx_balance;

  const usdt_balance = botUserConfig.usdt_balance;

  const message = [
    '请输入要兑换的TRX金额：',
    '',
    `当前TRX余额：${trx_balance}`,
    `当前USDT余额：${usdt_balance}`,
    '',
    '⏳ 此操作将在 5 分钟后过期',
  ].join('\n');

  await ctx
    .editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: returnKeyboard,
    })
    .catch(() => {
      // 如果编辑失败（消息可能已被删除），则发送新消息
      return ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: returnKeyboard,
      });
    });

  let isValidInput = false;
  while (!isValidInput) {
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
      continue;
    }

    if (amount > trx_balance) {
      await ctx.reply('余额不足', {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard,
      });
      continue;
    }

    await ctx.reply('请输入接收地址：');

    const addressResult = await conversation.waitFor(['message:text'], {
      maxMilliseconds: TIMEOUT,
    });

    const receive_address = addressResult.message?.text;

    if (!receive_address) {
      await ctx.reply('❌ 请输入有效的地址');
      continue;
    }

    // 输入有效且余额充足，显示确认信息
    const confirmMessage = [
      '请确认兑换信息：',
      '',
      `兑换金额：${amount} TRX`,
      `当前余额：${trx_balance} TRX`,
      `接收地址：${receive_address}`,
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
      try {
        await ctx.reply(`✅ 已收到兑换请求：${amount} TRX\n处理中...`);

        const exchange = await Exchange.create({
          id: await IdGen.next(Exchange, 'id', 6),
          bot: ctx.currentBot._id,
          botUser: ctx.currentBotUser._id,
          to_address: receive_address,
          rate: ctx.currentBot.exchange_rate,
          fee: ctx.currentBot.fee,
          status: 'pending',
          expiredAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });

        const txId = await sendTRX(
          exchange._id,
          private_key,
          receive_address,
          amount,
        );

        exchange.txid = txId;
        exchange.status = 'completed';
        await exchange.save();

        await ctx.reply(`✅ TRX转账成功`, {
          reply_markup: new InlineKeyboard().url(
            '查看交易',
            `https://tronscan.org/#/transaction/${txId}`,
          ),
        });
      } catch (error) {
        await ctx.reply(`❌ 发送失败: ${error.message}`);
      } finally {
        isValidInput = true;
      }
    }
  }
}

exchangeTrxToUsdtComposer.use(
  createConversation(trxToUsdtExchangeConversation),
);

exchangeTrxToUsdtComposer.callbackQuery('trx_to_usdt', async (ctx) => {
  debug('trx_to_usdt callback triggered');

  await ctx.conversation.exitAll();

  await ctx.conversation.enter('trxToUsdtExchangeConversation', {
    botUserConfig: ctx.currentBotUserConfig,
    private_key: ctx.currentBot.private_key,
  });
});

export default exchangeTrxToUsdtComposer;
