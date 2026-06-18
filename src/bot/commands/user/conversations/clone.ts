import { Composer } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import { cancelKeyboard } from '../../../menus/inline/cacel';
import { setWebhook } from '../../../../controllers/botController';
import Bot from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { IUser } from '../../../../models/user';
import createDebug from 'debug';

const debug = createDebug('bot:clone');
const cloneConversationComposer = new Composer<MyContext>();
const TIMEOUT = 5 * 60 * 1000;

// 这个是放在 clone_start 那的
async function cloneBotConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    botUser,
    proxyUser,
  }: {
    botUser: IBotUser;
    proxyUser: IUser;
  },
) {
  debug('等待用户输入token或取消');
  // 等待用户输入token或取消
  const result = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  // 处理取消
  if (
    (result.message && result.message.text === '取消') ||
    (result.callbackQuery &&
      (result.callbackQuery.data === 'close' ||
        result.callbackQuery.data === 'cancel'))
  ) {
    await ctx.reply('已取消克隆操作。');
    return;
  }

  // 检查token格式
  const token = result.message?.text?.trim();
  if (!token || !/^\d{8,}:[A-Za-z0-9_-]{35,}$/.test(token)) {
    await ctx.reply(
      [
        '❗ <b>请输入正确的机器人Token格式</b>，例如：',
        '<code>6422100000:AAFMTBWko3t7gA3mN5SRYp5FuYcxxxxxxxxx</code>',
        '',
        '如需取消，请点击下方按钮。',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard,
      },
    );
    // 递归等待用户重新输入
    return await cloneBotConversation(conversation, ctx, {
      botUser,
      proxyUser,
    });
  }

  // 处理收到的token
  debug('收到用户token:', token);
  await ctx.reply('✅ 已收到您的机器人Token，正在为您处理克隆，请稍候...');

  console.debug('克隆时 botUser:', botUser);

  const addResult = await addBot(token, proxyUser, botUser);

  if (addResult && addResult.success) {
    await ctx.reply('✅ 克隆成功，请在机器人列表中查看。');
  } else {
    let failMsg = '❌ 克隆失败，请稍后再试。';
    if (addResult && addResult.message) {
      failMsg += `\n${addResult.message}`;
    }
    await ctx.reply(failMsg);
  }
  // 这里可以继续后续的克隆逻辑
}

// 克隆就是添加机器人，克隆者自动成为 owner
async function addBot(
  token: string,
  proxyUser: IUser,
  botUser: IBotUser,
): Promise<{ success: boolean; message?: string }> {
  try {
    // 检查 token 是否已存在
    const botExists = await Bot.findOne({ token });
    if (botExists) {
      return {
        success: false,
        message: '该 Bot Token 已被使用，请使用其他 Token',
      };
    }

    const newBot = new Bot({
      token,
      owner: botUser._id,
      botUsers: [botUser._id],
      user: proxyUser._id,
    });

    await newBot.save();
    await setWebhook(newBot);

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || '添加 Bot 失败' };
  }
}

// 注册对话
cloneConversationComposer.use(createConversation(cloneBotConversation));

// 入口按钮
cloneConversationComposer.callbackQuery('clone_start', async (ctx) => {
  debug('clone_start clicked');
  await ctx.conversation.exitAll();

  debug('开始克隆机器人对话');
  // 发送克隆流程说明
  await ctx.reply(
    [
      '🤖 <b>克隆机器人流程</b>',
      '',
      '1. 打开 <b>@BotFather</b>',
      '2. 发送 <code>/newbot</code>',
      '3. 按指引设置机器人名字（可中文）',
      '4. 设置机器人 <b>username</b>（英文+数字，需以 <code>bot</code> 结尾）',
      '5. 创建完成后将注册好的 <b>token</b> 发送给我',
      '',
      'token格式示例：',
      '<code>6422100000:AAFMTBWko3t7gA3mN5SRYp5FuYcxxxxxxxxx</code>',
      '',
      '⏳ 此操作将在 5 分钟后过期。',
      '',
      '如需取消，请点击下方按钮。',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: cancelKeyboard,
    },
  );

  await ctx.conversation.enter('cloneBotConversation', {
    botUser: ctx.currentBotUser,
    proxyUser: ctx.currentProxyUser,
  });
  await ctx.answerCallbackQuery();
});

export default cloneConversationComposer;
