// src/middlewares/logger.ts
import { Middleware } from 'grammy';
import createDebug from 'debug';
import BotMessage from '../../models/botMessage';
import { MyContext } from '../types';

const debug = createDebug('bot:logger');

// 定义一个日志中间件
const logger: Middleware = async (ctx: MyContext, next) => {
  debug('logger');
  debug(ctx.message);
  const messageType = ctx.message?.text
    ? 'text'
    : ctx.message?.photo
      ? 'photo'
      : ctx.message?.video
        ? 'video'
        : ctx.message?.voice
          ? 'voice'
          : ctx.message?.document
            ? 'document'
            : ctx.message?.sticker
              ? 'sticker'
              : ctx.message?.location
                ? 'location'
                : ctx.message?.entities?.some(
                      (entity) => entity.type === 'mention',
                    )
                  ? 'mention'
                  : '未知消息类型';

  let messageContent = ctx.message?.text;

  if (
    ctx.message?.photo ||
    ctx.message?.video ||
    ctx.message?.document ||
    ctx.message?.animation
  ) {
    try {
      const file = await ctx.getFile();
      messageContent = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    } catch (err) {
      console.error('获取文件路径失败:', err);
    }
  }

  // 如果消息包含@提及，添加被提及的用户信息
  if (ctx.message?.entities?.some((entity) => entity.type === 'mention')) {
    const mentions = ctx.message.entities
      .filter((entity) => entity.type === 'mention')
      .map(
        (entity) =>
          ctx.message?.text?.substring(
            entity.offset,
            entity.offset + entity.length,
          ),
      )
      .join(', ');
    messageContent = `${messageContent} (提及用户: ${mentions})`;
  }

  console.log('messageContent-photo: ', (await ctx.getFile()).file_path);

  await BotMessage.create({
    bot: ctx.currentBot._id,
    botUser: ctx.currentBotUser._id,
    group: ctx.currentGroup?._id || null,
    content: messageContent,
    messageType,
  });

  const timestamp = new Date().toLocaleString('zh-CN');

  debug(
    `用户 ${
      ctx.from?.username || ctx.from?.id
    } 在 ${timestamp} 发来了 ${messageType} 类型消息: ${messageContent}`,
  );
  await next();
};

export default logger;
