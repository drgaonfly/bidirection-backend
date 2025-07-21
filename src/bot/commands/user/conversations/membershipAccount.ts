import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import createDebug from 'debug';

const debug = createDebug('bot:membership-account');
const membershipAccountCallback = new Composer<MyContext>();

// 超时时间设置为5分钟
const TIMEOUT = 5 * 60 * 1000;

const cancelKeyboard = new InlineKeyboard().text(
  '❌ 取消',
  'cancel_membership_account',
);

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

async function membershipAccountConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
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
        reply_markup: cancelKeyboard,
      },
    );
    return await membershipAccountConversation(conversation, ctx);
  }

  const { isValid, username } = isValidTelegramFormat(message.text);

  if (!isValid) {
    await ctx.reply(
      '❗ 账号格式无效，请重新输入\n例如：@username 或 https://t.me/username',
      {
        reply_markup: cancelKeyboard,
      },
    );
    return await membershipAccountConversation(conversation, ctx);
  }

  try {
    // 这里可以添加实际的用户验证逻辑
    // 例如：检查用户是否存在，是否可以接收消息等
    debug('正在验证用户:', username);
    const userExists = await ctx.api.getChat('@' + username).catch(() => null);

    if (!userExists) {
      await ctx.reply('❗ 账号不存在或异常，请重新输入', {
        reply_markup: cancelKeyboard,
      });
      return await membershipAccountConversation(conversation, ctx);
    }

    debug('用户信息:', JSON.stringify(userExists));

    // 用户验证成功，可以继续处理
    await ctx.reply(
      [
        '⚠️ 请按全额支付，否则无法到账⚠️',
        '',
        '✈️ 飞机会员: 3个月Telegram Premium会员',
        '用户账号: @' + username,
        '用户昵称: ' + (userExists.first_name || username),
        '支付金额: 15.018 USDT',
        '收款地址: TF6VpWQ16AdBs4NJGBHT6wqT2u66666666',
        '',
        '❗ 请务必按全额支付，全额带小数',
        '⚠️ 禁止使用交易所代付',
      ].join('\n'),
    );

    // 这里可以添加后续处理逻辑
    // 比如保存到session或数据库中
    const session = await conversation.external(() => ctx.session);
    if (session) {
      //   session.membershipAccount = username;
    }
  } catch (error) {
    debug('验证账号时出错:', error);
    await ctx.reply('❗ 验证账号时出现错误，请重新输入', {
      reply_markup: cancelKeyboard,
    });
    return await membershipAccountConversation(conversation, ctx);
  }
}

// 创建对话处理器
membershipAccountCallback.use(
  createConversation(membershipAccountConversation),
);

// 开始验证账号的回调处理
membershipAccountCallback.callbackQuery(
  'verify_membership_account',
  async (ctx) => {
    debug('verify_membership_account clicked');
    await ctx.conversation.exitAll();

    await ctx.reply(
      [
        '请输入需要开通会员的Telegram账号:',
        '',
        '⚠️ 支持以下格式：',
        '- @username',
        '- https://t.me/username',
        '',
        '⏳ 此操作将在 5 分钟后过期。',
        '',
      ].join('\n'),
      { reply_markup: cancelKeyboard },
    );

    await ctx.conversation.enter('membershipAccountConversation');
    await ctx.answerCallbackQuery();
  },
);

// 取消操作的回调处理
membershipAccountCallback.callbackQuery(
  'cancel_membership_account',
  async (ctx) => {
    debug('cancel_membership_account clicked');

    await ctx.conversation.exitAll();
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery('已取消操作');
  },
);

export default membershipAccountCallback;
