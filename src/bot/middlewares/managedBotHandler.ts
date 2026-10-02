import { MyContext } from '../types';
import Bot from '../../models/bot';
import { createBot } from '../../utils/createBotWithUser';
import createDebug from 'debug';

const debug = createDebug('bot:managedBotHandler');

/**
 * 处理 managed_bot update。
 * 用户通过 https://t.me/newbot/${bot.userName} 在 BotFather 创建机器人后，
 * Telegram 自动把新 bot 的信息推送过来，无需用户手动复制 token。
 */
async function handleManagedBot(ctx: MyContext) {
  let userId: number;
  try {
    // @ts-ignore - managed_bot is a new update type (grammy 1.45.1+)
    const managedBot = ctx.update.managed_bot;
    if (!managedBot) {
      debug('[handleManagedBot] No managed_bot data in update');
      return;
    }

    const botId = managedBot.bot.id;
    const botUser = managedBot.user;
    userId = botUser.id;

    debug('[handleManagedBot] Received managed_bot update:', {
      botId,
      userId,
    });

    // 检查是否已经创建过这个机器人
    const existingBot = await Bot.findOne({ id: String(botId) });
    if (existingBot) {
      debug('[handleManagedBot] Bot already exists:', existingBot._id);
      return;
    }

    // 获取 managed bot 的 token
    let token: string;
    try {
      // @ts-ignore - getManagedBotToken is a new API method (grammy 1.45.1+)
      token = await ctx.api.getManagedBotToken(botId);
      debug('[handleManagedBot] Token received successfully');
    } catch (e: any) {
      debug('[handleManagedBot] Failed to get token:', e.message);
      await ctx.api.sendMessage(userId, '❌ 获取机器人 token 失败，请稍后重试');
      return;
    }

    const currentBot = ctx.currentBot;
    if (!currentBot) {
      debug('[handleManagedBot] No current bot found');
      return;
    }

    const currentBotUser = ctx.currentBotUser;
    if (!currentBotUser) {
      debug('[handleManagedBot] No current bot user found');
      return;
    }

    debug(
      '[handleManagedBot] Creating bot with token:',
      token.slice(0, 10) + '...',
    );

    const result = await createBot(token, currentBot, currentBotUser);

    if (result.success) {
      const { userName } = result.account!;

      await ctx.api.sendMessage(
        userId,
        [
          '✅ <b>机器人创建成功！</b>',
          '',
          '您的专属机器人已创建完成。',
          '',
          '请点击下方用户名打开您的机器人，并将其添加至群组，设置为管理员。',
          '',
          `您的机器人：@${userName}`,
          '',
          '🤖 机器人正在初始化，稍后即可正常使用。',
        ].join('\n'),
        { parse_mode: 'HTML' },
      );

      debug('[handleManagedBot] Bot created successfully:', userName);
    } else {
      await ctx.api.sendMessage(
        userId,
        `❌ 机器人创建失败：${result.message || '请稍后再试'}`,
      );
      debug('[handleManagedBot] Bot creation failed:', result.message);
    }
  } catch (e: any) {
    debug('[handleManagedBot] Error:', e.message);
    if (userId) {
      await ctx.api.sendMessage(userId, '❌ 处理机器人创建时发生错误');
    }
  }
}

export default handleManagedBot;
