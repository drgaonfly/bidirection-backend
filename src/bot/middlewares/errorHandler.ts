// src/middlewares/errorHandler.ts
import { GrammyError, Middleware } from 'grammy';
import createDebug from 'debug';

const debug = createDebug('bot:error');

// 这些错误属于正常业务情况，不需要回复用户
const SILENT_ERROR_DESCRIPTIONS = [
  'message is not modified',
  'group chat was upgraded to a supergroup chat',
  'query is too old',
];

const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    debug('发生错误:', err);

    if (err instanceof GrammyError) {
      const isSilent = SILENT_ERROR_DESCRIPTIONS.some(
        (desc) => err.description?.includes(desc),
      );
      if (isSilent) {
        debug('静默忽略错误: %s', err.description);
        return;
      }
    }

    try {
      await ctx.reply(`抱歉，发生了一些错误: ${err}`);
    } catch (replyErr) {
      debug('回复错误消息失败:', replyErr);
    }
  }
};

export default errorHandler;
