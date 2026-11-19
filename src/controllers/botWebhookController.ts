import { Request, Response, NextFunction } from 'express';
import { webhookCallback } from 'grammy';
import { default as BotManager } from '../models/bot';
import { setupBot } from '../bot/botSetup';

// 按 botId 缓存 bot 实例，避免每次请求重新创建
const botCache = new Map<string, ReturnType<typeof setupBot>>();

export const clearBotCache = (botId: string) => {
  botCache.delete(botId);
};

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

    // 处理超时或失败也照常应答 200：Telegram 收不到 2xx 会反复重投同一条
    // update，并阻塞该 bot 的后续消息。
    const callback = webhookCallback(bot!, 'express', (err) => {
      console.error(`[webhook] bot ${botId} 处理超时:`, err?.error ?? err);
    });
    try {
      await callback(req, res);
    } catch (err: any) {
      console.error(
        `[webhook] bot ${botId} update ${req.body?.update_id} 处理失败，已应答:`,
        err?.error ?? err,
      );
      if (!res.headersSent) res.sendStatus(200);
    }
  } catch (err) {
    next(err);
  }
};
