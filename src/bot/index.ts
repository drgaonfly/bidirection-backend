import dotenv from 'dotenv';
import { setupBot } from './botSetup';
import { default as BotManager } from '../models/bot';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setWebhookWithRetry = async (
  bot: ReturnType<typeof setupBot>,
  activeBot: any,
  WEBHOOK_URL: string,
  retries = 5,
) => {
  const allowedUpdates = [
    'message',
    'edited_message',
    'callback_query',
    'inline_query',
    'message_reaction',
    'message_reaction_count',
    'my_chat_member',
    'managed_bot',
  ] as const;

  // deleteWebhook 失败不阻断，直接尝试 setWebhook
  try {
    await bot.api.deleteWebhook();
  } catch (delErr: any) {
    console.warn(
      `${activeBot.userName} deleteWebhook 失败，跳过继续 setWebhook:`,
      delErr?.message,
    );
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await bot.api.setWebhook(`${WEBHOOK_URL}/bot-webhooks/${activeBot._id}`, {
        // @ts-ignore
        allowed_updates: allowedUpdates,
      });
      console.log(
        `${activeBot.userName} Webhook 已设置为 ${WEBHOOK_URL}/bot-webhooks/${activeBot._id}`,
      );
      return;
    } catch (err: any) {
      if (err?.error_code === 401) {
        throw err; // token 失效，直接抛出让外层处理
      }
      console.warn(
        `⚠️  ${activeBot.userName} setWebhook 失败 (${attempt}/${retries}):`,
        err?.message,
      );
      if (attempt < retries) {
        await sleep(attempt * 2000);
      }
    }
  }
  console.error(`❌ ${activeBot.userName} setWebhook 最终失败，已放弃`);
};

export const startWebHookBot = async () => {
  await setupDB();
  await setupRedis();
  const activeBots = await BotManager.find({ isOnline: true });
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  // 串行注册，避免大量并发打爆 Telegram API 连接
  for (const activeBot of activeBots) {
    try {
      const bot = setupBot(activeBot.token);
      console.log('Bot 正在运行于生产模式');
      await setWebhookWithRetry(bot, activeBot, WEBHOOK_URL!);
    } catch (err: any) {
      if (err?.error_code === 401) {
        console.error(
          `Bot ${activeBot.userName} (${activeBot.token}) token 已失效，自动下线`,
        );
        await BotManager.findByIdAndUpdate(activeBot._id, { isOnline: false });
      } else {
        console.error(
          `设置 bot ${activeBot.userName} webhook 时出错:`,
          err?.message,
        );
      }
    }
    // 每个 bot 之间间隔 200ms，避免瞬间并发
    await sleep(200);
  }
};

startWebHookBot()
  .then(() => {
    // 执行完成后退出进程
    process.exit(0);
  })
  .catch((error) => {
    // 发生错误时打印错误并以错误状态码退出
    console.error('启动 Webhook Bot 时发生错误:', error);
    process.exit(1);
  });
