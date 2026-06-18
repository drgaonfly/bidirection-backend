import dotenv from 'dotenv';
import { setupBot } from './botSetup';
import { default as BotManager } from '../models/bot';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
dotenv.config();

export const startWebHookBot = async () => {
  await setupDB();
  await setupRedis();
  const activeBots = await BotManager.find({ isOnline: true });

  for (const activeBot of activeBots) {
    try {
      const bot = await setupBot(activeBot.token);
      const WEBHOOK_URL = process.env.WEBHOOK_URL;

      console.log('Bot 正在运行于生产模式');

      // 始终重新设置 webhook 以确保 allowed_updates 是最新的
      await bot.api.setWebhook(`${WEBHOOK_URL}/bot-webhooks/${activeBot._id}`, {
        allowed_updates: [
          'message',
          'edited_message',
          'callback_query',
          'inline_query',
          'message_reaction',
          'message_reaction_count',
        ],
      });

      console.log(
        `${activeBot.userName} Webhook ${activeBot.token} 已设置为 ${WEBHOOK_URL}/webhook-${activeBot.token}`,
      );
    } catch (err) {
      console.error(
        `设置 bot ${activeBot.userName} (${activeBot.token}) webhook 时出错:`,
        err,
      );
      continue;
    }
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
