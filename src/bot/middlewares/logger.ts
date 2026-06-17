// src/middlewares/logger.ts
import { Middleware } from 'grammy';
import BotUser from '../../models/botUser';
import BotMessage from '../../models/botMessage';
import { MyContext } from '../types';
import { setupBot } from '../botSetup';
import createDebug from 'debug';

const debug = createDebug('bot:logger');

// 定义一个日志中间件
const logger: Middleware = async (ctx: MyContext, next) => {
  debug('logger');
  const message = ctx.message;

  debug(message);
  let messageType: string;
  switch (true) {
    case !!message?.text:
      messageType = 'text';
      break;
    case !!message?.photo:
      messageType = 'photo';
      break;
    case !!message?.video:
      messageType = 'video';
      break;
    case !!message?.voice:
      messageType = 'voice';
      break;
    case !!message?.document:
      messageType = 'document';
      break;
    case !!message?.sticker:
      messageType = 'sticker';
      break;
    case !!message?.location:
      messageType = 'location';
      break;
    case !!message?.entities?.some((entity) => entity.type === 'mention'):
      messageType = 'mention';
      break;
    default:
      messageType = '未知消息类型';
  }

  let messageContent = message?.text;

  debug('message: ', message);

  if (
    message?.photo ||
    message?.video ||
    message?.document ||
    message?.animation
  ) {
    try {
      const file = await ctx.getFile();
      messageContent = `https://api.telegram.org/file/bot${ctx.currentBot.token}/${file.file_path}`;
    } catch (err) {
      debug('获取文件路径失败:', err);
    }
  }

  // 如果消息包含@提及，添加被提及的用户信息
  if (message?.entities?.some((entity) => entity.type === 'mention')) {
    const mentions = message.entities
      .filter((entity) => entity.type === 'mention')
      .map(
        (entity) =>
          message?.text?.substring(
            entity.offset,
            entity.offset + entity.length,
          ),
      )
      .join(', ');
    debug(`${messageContent} (提及用户: ${mentions})`);
  }

  if (!ctx.callbackQuery && messageContent) {
    await BotMessage.create({
      bot: ctx.currentBot._id,
      botUser: ctx.currentBotUser._id,
      group: ctx.currentGroup?._id,
      content: messageContent,
      messageType,
    });
  }

  const ownerDoc = ctx.currentBot.owner
    ? await BotUser.findById(ctx.currentBot.owner)
    : null;

  // 检查当前用户是否是拥有者
  const isOwner = ownerDoc?.id === ctx.currentBotUser.id;

  console.log(
    `[Logger] Checking bidirectional for user ${ctx.currentBotUser.id}, isOwner: ${isOwner}`,
  );

  // 如果是拥有者回复消息，且双向功能可用，则转发给原始用户，同时也发送给其他拥有者
  if (isOwner && message?.reply_to_message) {
    try {
      console.log('=== 拥有者回复检测 ===');
      console.log('回复的消息:', message.reply_to_message);

      const replyMsg = message.reply_to_message as any;
      let originalUserId: number | undefined;

      // 检查回复的消息是否是转发的消息
      if (replyMsg.forward_from || replyMsg.forward_from_chat) {
        originalUserId = replyMsg.forward_from?.id;

        if (originalUserId) {
          const bot = setupBot(ctx.currentBot.token);

          // 获取被回复的客户 BotUser
          let originalBotUser: any = null;
          try {
            originalBotUser = await BotUser.findOne({
              id: originalUserId.toString(),
              bot: ctx.currentBot._id,
            });
          } catch (err) {
            console.error('获取原始用户信息失败:', err);
          }

          // 检测消息类型和内容
          const mediaTypes = {
            photo: message?.photo?.[message.photo.length - 1]?.file_id,
            video: message?.video?.file_id,
            document: message?.document?.file_id,
            animation: message?.animation?.file_id,
            voice: message?.voice?.file_id,
            audio: message?.audio?.file_id,
            sticker: message?.sticker?.file_id,
            video_note: message?.video_note?.file_id,
          };
          const mediaType = Object.entries(mediaTypes).find(
            ([_, id]) => id,
          )?.[0];
          const fileId = mediaType ? mediaTypes[mediaType] : null;
          const ownerReplyMessageType = mediaType || messageType;
          const ownerReplyContent = fileId || message?.text || messageContent;

          try {
            // 将拥有者的回复复制给原始用户
            await bot.api.copyMessage(
              originalUserId,
              ctx.chat.id,
              message.message_id,
            );

            console.log(`✅ 已将拥有者的回复发送给用户: ${originalUserId}`);
          } catch (copyErr: any) {
            // 如果复制失败（比如用户还没有和机器人开始对话）
            if (
              copyErr.error_code === 400 &&
              copyErr.description?.includes('chat not found')
            ) {
              console.log(
                `用户 ${originalUserId} 还没有和机器人开始对话，无法发送回复`,
              );
              await ctx.reply('❌ 发送失败：用户还没有和机器人开始对话');
            } else {
              console.error('发送回复给用户失败:', copyErr);
              const errorMsg =
                copyErr?.message ||
                copyErr?.description ||
                copyErr?.toString() ||
                '未知错误';
              await ctx.reply(`❌ 发送失败：${errorMsg}`);
            }
          }

          // 保存拥有者回复的消息到数据库（关联到客户的 BotUser）
          // 即使 originalBotUser 不存在，也要尝试保存（使用当前拥有者作为 botUser）
          try {
            let targetBotUser = originalBotUser;

            // 如果找不到客户的 BotUser，使用拥有者的 BotUser（可能是拥有者在回复）
            if (!targetBotUser) {
              console.warn(
                `未找到客户 BotUser (ID: ${originalUserId})，使用拥有者 BotUser`,
              );
              targetBotUser = ctx.currentBotUser;
            }

            if (targetBotUser) {
              await BotMessage.create({
                bot: ctx.currentBot._id,
                botUser: targetBotUser._id, // 关联到客户或拥有者
                group: ctx.currentGroup?._id,
                content: ownerReplyContent,
                messageType: ownerReplyMessageType,
                caption: message?.caption,
                telegramMessageId: message.message_id, // 电报消息 ID
                proxyUser: ctx.currentProxyUser?._id, // 代理用户
                isOwnerReply: true, // 标记为拥有者回复
                raw: message, // 原始消息体
              });
              console.log(
                `✅ 已保存拥有者回复消息到数据库，关联到: ${
                  originalBotUser
                    ? `客户 (${originalUserId})`
                    : `拥有者 (${targetBotUser.id})`
                }`,
              );
            } else {
              console.error(
                `无法保存拥有者回复消息：找不到 BotUser (客户ID: ${originalUserId})`,
              );
            }
          } catch (saveErr: any) {
            console.error('保存拥有者回复消息失败:', saveErr);
            console.error('错误详情:', saveErr.message || saveErr);
          }

          // 将拥有者的回复也发送给其他拥有者（单 owner 模式，无需额外转发）
        }
      }
    } catch (err: any) {
      console.error('转发拥有者回复失败:', err);
      const errorMsg =
        err?.message || err?.description || err?.toString() || '未知错误';
      await ctx.reply(`❌ 发送失败：${errorMsg}`);
    }

    // 拥有者的回复不需要继续处理
    await next();
    return;
  }

  // 自己是拥有者的话，不要发给自己（单 owner 模式，无需额外处理）

  const timestamp = new Date().toLocaleString('zh-CN');

  debug(
    `用户 ${
      ctx.from?.username || ctx.from?.id
    } 在 ${timestamp} 发来了 ${messageType} 类型消息: ${messageContent}`,
  );
  await next();
};

export default logger;
