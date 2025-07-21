import {
  handleBuyMembershipCommand,
  MEMBERSHIP_PRICES,
  MEMBERSHIP_NAMES,
} from '../membership/buyMembership';
import { MyContext } from '../../../types';
import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import createDebug from 'debug';
import { getUserByUsername } from '../operator/add';
import { findBotAndUser } from '../../../services/findBotAndUser';
import MemberOrder from '../../../../models/memberOrder';
import { generateOrderNumber } from '../../../../utils/generateOrderNumber';

// 创建一个新的 Composer 实例
const membershipingCallback = new Composer<MyContext>();

const debug = createDebug('bot:membership');

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

async function membershipConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { duration }: { duration: string },
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
    if (data === 'cancel_membership_account') {
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
    return await membershipConversation(conversation, ctx, { duration });
  }

  const { isValid, username } = isValidTelegramFormat(message.text);

  if (!isValid) {
    await ctx.reply(
      '❗ 账号格式无效，请重新输入\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await membershipConversation(conversation, ctx, { duration });
  }

  try {
    debug('正在验证用户:', username);
    const { bot, botUser } = await findBotAndUser(ctx);
    const user = await getUserByUsername(bot.session, username);
    if (!user) {
      await ctx.reply('❗ 账号不存在或异常，请重新输入', {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      });
      return await membershipConversation(conversation, ctx, { duration });
    }

    debug('用户信息:', JSON.stringify(user));

    // 用户验证成功，可以继续处理
    await ctx.reply(
      [
        '⚠️ 请按全额支付，否则无法到账⚠️',
        '',
        `✈️ 飞机会员: ${MEMBERSHIP_NAMES[duration]}`,
        '用户账号: @' + username,
        '用户昵称: ' + (user.first_name || username),
        `支付金额: ${MEMBERSHIP_PRICES[duration]} USDT`,
        '收款地址: ' + bot.trx20_address,
        '',
        '❗ 请务必按全额支付，全额带小数',
        '⚠️ 禁止使用交易所代付',
      ].join('\n'),
    );

    // 创建会员订单
    const orderNumber = await generateOrderNumber();
    const endDate = new Date(Date.now() + 10 * 60 * 1000); // 当前时间 + 10分钟

    const memberOrder = new MemberOrder({
      orderNumber,
      botUser: botUser._id,
      bot: bot._id,
      status: 'pending',
      amount: MEMBERSHIP_PRICES[duration],
      membershipType: duration,
      endDate,
      paymentAddress: bot.trx20_address,
    });

    debug('memberOrder', JSON.stringify(memberOrder));

    await memberOrder.save();
  } catch (error) {
    debug('验证账号时出错:', error);
    await ctx.reply('❗ 验证账号时出现错误，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await membershipConversation(conversation, ctx, { duration });
  }
}

membershipingCallback.use(createConversation(membershipConversation));

// Handle membership button clicks
membershipingCallback.callbackQuery(/^buy_membership_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const duration = ctx.match[1];
  await handleBuyMembershipCommand(ctx, duration);

  await ctx.conversation.enter('membershipConversation', { duration });
});

export default membershipingCallback;
