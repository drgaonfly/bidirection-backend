import handleAsync from '../utils/handleAsync';
import { Request, Response } from 'express';
import { default as BotManager } from '../models/bot';
import { setupBot } from '../bot/botSetup';
import { handleReactionUpdate } from '../bot/middlewares/reactionRelay';

export const handleBotWebhook = handleAsync(
  async (req: Request, res: Response) => {
    const update = req.body;

    const botId = req.params.id;

    const botManager = await BotManager.findOne({ isOnline: true, _id: botId });

    if (!botManager) {
      res.status(404);
      throw new Error('bot not found');
    }

    // message_reaction update 里没有 ctx.from / ctx.message，
    // 走普通中间件链会在 botUserResolver 崩溃，单独处理后直接返回。
    if (update.message_reaction) {
      await handleReactionUpdate(botManager.token, update);
      res.sendStatus(200);
      return;
    }

    const bot = setupBot(botManager.token);

    // 注意：webhook 模式下不能调用 bot.start()，它是 long-polling 专用的。
    await bot.handleUpdate(update);
  },
);
