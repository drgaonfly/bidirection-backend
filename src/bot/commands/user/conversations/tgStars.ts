import { handleBuyStarsCommand } from '../membership/buyStars';
import { MyContext } from '../../../types';
import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import createDebug from 'debug';
import { getUserByUsername } from '../operator/add';
import { findBotAndUser } from '../../../services/findBotAndUser';
import TgStarsOrder from '../../../../models/tgStarsOrder';
import { generateOrderNumber } from '../../../../utils/generateOrderNumber';

// 创建一个新的 Composer 实例
const tgStarsCallback = new Composer<MyContext>();

const debug = createDebug('bot:tgStars');

const TIMEOUT = 5 * 60 * 1000;

// 验证TG用户名格式
function isValidTelegramFormat(input: string): {
  isValid: boolean;
  username: string;
} {
  // 移除可能的@符号和t.me链接前缀
  let username = input.trim();

  // 处理t.me链接格式
  if (username.includes('t.me/')) {
    username = username.split('t.me/')[1];
  }

  // 移除开头的@符号
  if (username.startsWith('@')) {
    username = username.substring(1);
  }

  // Telegram用户名规则：5-32个字符，只允许字母数字和下划线
  const isValid = /^[a-zA-Z0-9_]{5,32}$/.test(username);

  return { isValid, username };
}

async function tgStarsConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { amount }: { amount: number },
) {
  debug('等待用户输入Telegram账号');

  const conversationResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  const { message } = conversationResult;

  // 检查是否取消
  if (message?.text === '取消') {
    await ctx.reply('已取消操作');
    return;
  }

  if (conversationResult.callbackQuery) {
    const { data } = conversationResult.callbackQuery;
    if (data === 'cancel_tgstars_account') {
      await ctx.reply('已取消操作');
      return;
    }
  }

  if (!message?.text) {
    await ctx.reply(
      '❗ 请输入正确的Telegram账号\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await tgStarsConversation(conversation, ctx, { amount });
  }

  const { isValid, username } = isValidTelegramFormat(message.text);

  if (!isValid) {
    await ctx.reply(
      '❗ 账号格式无效，请重新输入\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await tgStarsConversation(conversation, ctx, { amount });
  }

  try {
    debug('正在验证用户:', username);
    const { bot, botUser } = await findBotAndUser(ctx);
    const user = await getUserByUsername(bot.session, username);
    if (!user) {
      await ctx.reply('❗ 账号不存在或异常，请重新输入', {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      });
      return await tgStarsConversation(conversation, ctx, { amount });
    }

    debug('用户信息:', JSON.stringify(user));

    // 用户验证成功，可以继续处理
    // 创建星星订单
    const generatedOrderNumber = await generateOrderNumber();
    const endDate = new Date(Date.now() + 10 * 60 * 1000); // 当前时间 + 10分钟
    const price = (amount / 50).toFixed(2); // 50颗星星 = 1U

    await ctx.reply(
      [
        '⚠️ 请按全额支付，否则无法到账⚠️',
        '',
        `⭐ Telegram Stars: ${amount}颗星星`,
        '用户账号: @' + username,
        '用户昵称: ' + (user.first_name || username),
        `支付金额: ${price} USDT`,
        '收款地址: <code>' + bot.trx20_address + '</code> (点击地址可自动复制)',
        '',
        '❗ 请务必按全额支付，全额带小数',
        '⚠️ 禁止使用交易所代付',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text(
          '❌ 取消订单',
          `cancel_stars_order_${generatedOrderNumber}`,
        ),
      },
    );

    const tgStarsOrder = new TgStarsOrder({
      orderNumber: generatedOrderNumber,
      botUser: botUser._id,
      bot: bot._id,
      status: 'pending',
      amount: parseFloat(price),
      starsAmount: amount,
      endDate,
      paymentAddress: bot.trx20_address,
    });

    debug('tgStarsOrder', JSON.stringify(tgStarsOrder));

    await tgStarsOrder.save();
  } catch (error) {
    debug('验证账号时出错:', error);
    await ctx.reply('❗ 验证账号时出现错误，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await tgStarsConversation(conversation, ctx, { amount });
  }
}

tgStarsCallback.use(createConversation(tgStarsConversation));

// Handle stars button clicks
tgStarsCallback.callbackQuery(/^buy_stars_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const amount = parseInt(ctx.match[1]);
  await handleBuyStarsCommand(ctx);

  await ctx.conversation.enter('tgStarsConversation', { amount });
});

// 处理取消订单按钮点击
tgStarsCallback.callbackQuery(/^cancel_stars_order_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('订单已取消');
  const orderNumber = ctx.match[1];

  try {
    const order = await TgStarsOrder.findOne({ orderNumber });
    if (order) {
      order.status = 'cancelled';
      await order.save();
      await ctx.editMessageText('订单已取消');
    }
  } catch (error) {
    debug('取消订单时出错:', error);
    await ctx.reply('取消订单时出现错误，请联系客服');
  }
});

export default tgStarsCallback;
