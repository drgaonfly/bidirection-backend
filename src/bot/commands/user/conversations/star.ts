import Star from '../../../../models/star';
import { IUser } from '../../../../models/user';
import { MyContext } from '../../../types';
import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { getUserByUsername } from '../operator/add';
import { findBotAndUser } from '../../../services/findBotAndUser';
import { IdGen } from '../../../../utils/idGen';
import { isValidTelegramFormat } from '../../../../utils/validateTelegramFormat';
import createDebug from 'debug';

// 创建一个新的 Composer 实例
const starCallback = new Composer<MyContext>();

const debug = createDebug('bot:tgStars');

const TIMEOUT = 5 * 60 * 1000;

async function starConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { amount, proxy }: { amount: number; proxy: IUser },
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
    return await starConversation(conversation, ctx, { amount, proxy });
  }

  const { isValid, username } = isValidTelegramFormat(message.text);

  if (!isValid) {
    await ctx.reply(
      '❗ 账号格式无效，请重新输入\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await starConversation(conversation, ctx, { amount, proxy });
  }

  try {
    debug('正在验证用户:', username);
    const { bot, botUser } = await findBotAndUser(ctx);
    const user = await getUserByUsername(bot.session, username);
    if (!user) {
      await ctx.reply('❗ 账号不存在或异常，请重新输入', {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      });
      return await starConversation(conversation, ctx, { amount, proxy });
    }

    debug('用户信息:', JSON.stringify(user));

    // 用户验证成功，可以继续处理
    // 创建星星订单
    const orderId = await IdGen.next(Star, 'id', 6);
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
          `cancel_stars_order_${orderId}`,
        ),
      },
    );

    const newStar = new Star({
      id: orderId,
      botUser: botUser._id,
      bot: bot._id,
      proxy: proxy._id,
      status: 'pending',
      amount: parseFloat(price),
      count: amount,
      paymentAddress: bot.trx20_address,
      expiredAt: new Date(Date.now() + 10 * 60 * 1000), // 当前时间 + 10分钟
    });

    debug('Star', JSON.stringify(Star));

    await newStar.save();
  } catch (error) {
    debug('验证账号时出错:', error);
    await ctx.reply('❗ 验证账号时出现错误，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await starConversation(conversation, ctx, { amount, proxy });
  }
}

starCallback.use(createConversation(starConversation));

starCallback.callbackQuery(/^buy_stars_/, async (ctx) => {
  const amount = parseInt(ctx.callbackQuery.data.replace('buy_stars_', ''));
  await ctx.answerCallbackQuery();

  // 计算价格（50星星=1U）
  const price = (amount / 50).toFixed(2);

  const message = [
    '🎉 尊敬的用户您好！',
    '',
    `📌 您已选择订购 ${amount}颗星星 服务`,
    `💰 套餐价格：${price}U`,
    '',
    '✨ 开通步骤：',
    '1️⃣ 请复制并发送您的Telegram账号信息，格式如下：',
    '📤 用户名：@test',
    '🔗 个人链接：https://t.me/test',
    '',
    '⚠️ 温馨提示：',
    '• 请确保发送的账号信息准确无误',
    '• 如有疑问请联系客服',
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'HTML',
  });

  await ctx.conversation.enter('starConversation', {
    amount: amount,
    proxy: ctx.currentProxyUser,
  });
});

export default starCallback;
