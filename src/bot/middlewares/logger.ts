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
      telegramMessageId: message?.message_id,
    });
  }

  // 母机器人（isCreatedByAdmin）不参与双向通信
  if (!ctx.currentBot.isCreatedByAdmin) {
    // 通过 owner 的 BotUser 记录比较 telegram id
    let isOwner = false;
    let ownerBotUser: any = null;
    if (ctx.currentBot.owner) {
      ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
      isOwner = ownerBotUser?.id === ctx.currentBotUser.id;
    }

    console.log(`[Logger] user ${ctx.currentBotUser.id}, isOwner: ${isOwner}`);

    // ── owner 回复消息时，转发给原始用户 ──────────────────────────────
    if (isOwner && message?.reply_to_message) {
      try {
        const replyMsg = message.reply_to_message as any;

        // 只处理转发过来的消息（带有 forward_from）
        if (replyMsg.forward_from || replyMsg.forward_from_chat) {
          const originalUserId: number | undefined = replyMsg.forward_from?.id;

          if (originalUserId) {
            const bot = setupBot(ctx.currentBot.token);

            // 获取被回复的客户 BotUser
            let originalBotUser: any = null;
            try {
              originalBotUser = await BotUser.findOne({
                id: originalUserId.toString(),
              });
            } catch (err) {
              console.error('获取原始用户信息失败:', err);
            }

            // 复制消息给原始用户
            let forwardedMsgId: number | undefined;
            try {
              const copied = await bot.api.copyMessage(
                originalUserId,
                ctx.chat.id,
                message.message_id,
              );
              forwardedMsgId = copied.message_id;
              console.log(`✅ owner 回复已转发给用户: ${originalUserId}`);
            } catch (copyErr: any) {
              if (
                copyErr.error_code === 400 &&
                copyErr.description?.includes('chat not found')
              ) {
                await ctx.reply('❌ 发送失败：用户还没有和机器人开始对话');
              } else {
                const errorMsg =
                  copyErr?.message || copyErr?.description || String(copyErr);
                await ctx.reply(`❌ 发送失败：${errorMsg}`);
              }
            }

            // 保存 owner 回复到数据库
            // telegramMessageId  = owner 那边的原始消息 id（owner 点赞用）
            // forwardedMessageId = copy 给客户后客户那边的消息 id（客户点赞用）
            // forwardedToChatId  = 客户的 telegram id（客户点赞时要反查 owner）
            try {
              const targetBotUser = originalBotUser || ctx.currentBotUser;
              await BotMessage.create({
                bot: ctx.currentBot._id,
                botUser: targetBotUser._id,
                group: ctx.currentGroup?._id,
                content: message?.text || messageContent,
                messageType,
                caption: message?.caption,
                telegramMessageId: message.message_id,
                forwardedMessageId: forwardedMsgId,
                forwardedToChatId: originalUserId,
                isOwnerReply: true,
                raw: message,
              });
            } catch (saveErr: any) {
              console.error('保存 owner 回复失败:', saveErr.message || saveErr);
            }
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || err?.description || String(err);
        await ctx.reply(`❌ 发送失败：${errorMsg}`);
      }

      await next();
      return;
    }

    // ── 普通用户发消息，转发给 owner ─────────────────────────────────
    if (!isOwner && message && ownerBotUser?.id) {
      try {
        const bot = setupBot(ctx.currentBot.token);
        const forwarded = await bot.api.forwardMessage(
          ownerBotUser.id,
          ctx.chat.id,
          message.message_id,
        );
        console.log(
          `✅ 用户 ${ctx.currentBotUser.id} 的消息已转发给 owner: ${ownerBotUser.id}`,
        );

        // 保存原始消息记录，关联转发后在 owner 那边的 message_id，用于 reaction 互转
        if (messageContent) {
          await BotMessage.findOneAndUpdate(
            {
              bot: ctx.currentBot._id,
              botUser: ctx.currentBotUser._id,
              telegramMessageId: message.message_id,
            },
            {
              $set: {
                forwardedMessageId: forwarded.message_id,
                forwardedToChatId: Number(ownerBotUser.id),
              },
            },
          );
        }
      } catch (fwdErr: any) {
        console.error(
          '转发消息给 owner 失败:',
          fwdErr?.message || fwdErr?.description,
        );
      }
    }
  } // end if (!isCreatedByAdmin)

  const timestamp = new Date().toLocaleString('zh-CN');

  debug(
    `用户 ${
      ctx.from?.username || ctx.from?.id
    } 在 ${timestamp} 发来了 ${messageType} 类型消息: ${messageContent}`,
  );
  await next();
};

export default logger;
