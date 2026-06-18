import handleAsync from '../utils/handleAsync';
import { Request, Response } from 'express';
import { default as BotManager } from '../models/bot';
import { setupBot } from '../bot/botSetup';
import { handleReactionUpdate } from '../bot/middlewares/reactionRelay';

export const handleBotWebhook = handleAsync(
  async (req: Request, res: Response) => {
    // Handle the webhook
    console.log('Webhook received keys:', Object.keys(req.body || {}));

    const botId = req.params.id;

    const botManager = await BotManager.findOne({ isOnline: true, _id: botId });

    if (!botManager) {
      res.status(404);
      throw new Error('bot not found');
    }

    // message_reaction update 里没有 ctx.from / ctx.message，
    // 走普通中间件链会在 botUserResolver 崩溃，单独处理。
    if (req.body.message_reaction) {
      await handleReactionUpdate(botManager.token, req.body);
      res.sendStatus(200);
      return;
    }

    const bot = setupBot(botManager.token);

    // 先响应 200，Telegram 要求 webhook 尽快确认，否则会超时重试
    res.sendStatus(200);
    await bot.handleUpdate(req.body);
  },
);
