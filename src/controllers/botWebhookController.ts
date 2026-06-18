import { Request, Response, NextFunction } from 'express';
import { webhookCallback } from 'grammy';
import { default as BotManager } from '../models/bot';
import { setupBot } from '../bot/botSetup';

// 按 botId 缓存 bot 实例，避免每次请求重新创建
const botCache = new Map<string, ReturnType<typeof setupBot>>();

export const handleBotWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const botId = req.params.id;

    let bot = botCache.get(botId);

    if (!bot) {
      const botManager = await BotManager.findOne({
        isOnline: true,
        _id: botId,
      });

      if (!botManager) {
        res.status(404).json({ error: 'bot not found' });
        return;
      }

      bot = setupBot(botManager.token);
      botCache.set(botId, bot);
      console.log(`[webhook] bot ${botId} cached`);
    }

    // webhookCallback 是 grammY 官方推荐的 webhook 处理方式：
    // 它会自动处理 handleUpdate 并回复 200，无需手动调用
    return webhookCallback(bot, 'express')(req, res);
  } catch (err) {
    next(err);
  }
};
