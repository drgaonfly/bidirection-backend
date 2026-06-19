// src/middlewares/logger.ts
import { Middleware } from 'grammy';
import BotUser from '../../models/botUser';
import BotMessage from '../../models/botMessage';
import { MyContext } from '../types';
import { setupBot } from '../botSetup';
import createDebug from 'debug';
import Group from '../../models/group';
import Bot from '../../models/bot';
import {
  getOrCreateTopicForUser,
  getBotUserIdByThreadId,
} from '../services/topicService';

const debug = createDebug('bot:logger');

// ────────────────────────────────────────────────────────────
// 消息类型解析
// ────────────────────────────────────────────────────────────
function resolveMessageType(message: any): string {
  switch (true) {
    case !!message?.text:
      return 'text';
    case !!message?.photo:
      return 'photo';
    case !!message?.video:
      return 'video';
    case !!message?.voice:
      return 'voice';
    case !!message?.document:
      return 'document';
    case !!message?.sticker:
      return 'sticker';
    case !!message?.location:
      return 'location';
    case !!message?.entities?.some((e: any) => e.type === 'mention'):
      return 'mention';
    default:
      return '未知消息类型';
  }
}

// ────────────────────────────────────────────────────────────
// 主中间件
// ────────────────────────────────────────────────────────────
const logger: Middleware = async (ctx: MyContext, next) => {
  debug('logger');
  const message = ctx.message;

  const messageType = resolveMessageType(message);

  let messageContent = message?.text;

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

  // mention 附加信息（仅 debug）
  if (message?.entities?.some((e: any) => e.type === 'mention')) {
    const mentions = message.entities
      .filter((e: any) => e.type === 'mention')
      .map((e: any) => message?.text?.substring(e.offset, e.offset + e.length))
      .join(', ');
    debug(`${messageContent} (提及用户: ${mentions})`);
  }

  // 存储普通消息（非 callback）
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

  // 母机器人不参与双向通信
  if (ctx.currentBot.isCreatedByAdmin) {
    await next();
    return;
  }

  // ── 判断是否是 owner ──────────────────────────────────────
  let isOwner = false;
  let ownerBotUser: any = null;
  if (ctx.currentBot.owner) {
    ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
    isOwner = ownerBotUser?.id === ctx.currentBotUser.id;
  }

  debug(`[Logger] user ${ctx.currentBotUser.id}, isOwner: ${isOwner}`);

  // ── 检查当前群组的话题模式是否已完整配置 ─────────────────
  // 注意：用户发消息时是私聊（chat.type === 'private'），
  // ctx.currentGroup 为 null，需要查 bot.activeTopicGroup。
  const group = ctx.currentGroup;

  // 优先用 bot.activeTopicGroup（支持多群组切换）
  let topicGroup: typeof group = null;
  if (!ctx.currentBot.isCreatedByAdmin) {
    const botDoc = await Bot.findById(ctx.currentBot._id)
      .populate('activeTopicGroup')
      .lean();
    const candidate = botDoc?.activeTopicGroup as any;
    if (candidate && candidate.setupStep === 4) {
      topicGroup = candidate;
    }
  }

  const isTopicMode = !!topicGroup;

  // ────────────────────────────────────────────────────────
  // 分支 A：话题模式 + owner 在群组话题中发消息 → 转发给对应用户
  // （owner 在群组里操作，ctx.chat.type !== 'private'）
  // ────────────────────────────────────────────────────────
  if (
    isTopicMode &&
    isOwner &&
    message?.message_thread_id &&
    ctx.chat?.type !== 'private'
  ) {
    const threadId = message.message_thread_id;

    // 根据 threadId 找到对应的客户
    const targetBotUserId = getBotUserIdByThreadId(topicGroup, threadId);
    if (!targetBotUserId) {
      debug('未找到 threadId 对应的用户，跳过转发');
      await next();
      return;
    }

    try {
      const bot = setupBot(ctx.currentBot.token);
      let forwardedMsgId: number | undefined;

      try {
        const copied = await bot.api.copyMessage(
          Number(targetBotUserId),
          ctx.chat.id,
          message.message_id,
        );
        forwardedMsgId = copied.message_id;
        debug(`✅ owner 话题回复已转发给用户: ${targetBotUserId}`);
      } catch (copyErr: any) {
        if (
          copyErr.error_code === 400 &&
          copyErr.description?.includes('chat not found')
        ) {
          await bot.api.sendMessage(
            ctx.chat.id,
            '❌ 发送失败：用户还没有和机器人开始对话',
            { message_thread_id: threadId },
          );
        } else {
          const errorMsg =
            copyErr?.message || copyErr?.description || String(copyErr);
          await bot.api.sendMessage(ctx.chat.id, `❌ 发送失败：${errorMsg}`, {
            message_thread_id: threadId,
          });
        }
      }

      const targetBotUser = await BotUser.findOne({ id: targetBotUserId });

      await BotMessage.create({
        bot: ctx.currentBot._id,
        botUser: targetBotUser?._id || ctx.currentBotUser._id,
        group: topicGroup._id,
        content: message?.text || messageContent,
        messageType,
        caption: message?.caption,
        telegramMessageId: message.message_id,
        forwardedMessageId: forwardedMsgId,
        forwardedToChatId: Number(targetBotUserId),
        isOwnerReply: true,
        raw: message,
      });
    } catch (err: any) {
      const errorMsg = err?.message || err?.description || String(err);
      debug('话题模式 owner 回复转发失败:', errorMsg);
    }

    await next();
    return;
  }

  // ────────────────────────────────────────────────────────
  // 分支 B：话题模式 + 普通用户私聊发消息 → 转发到群组对应话题
  // ────────────────────────────────────────────────────────
  if (isTopicMode && !isOwner && message && ownerBotUser?.id) {
    try {
      const bot = setupBot(ctx.currentBot.token);

      // 从数据库重新获取 topicGroup（确保 botUserTopics 是最新的）
      const freshGroup = await Group.findById(topicGroup._id);
      if (!freshGroup) throw new Error('话题群组不存在');

      // 获取或创建该用户的专属话题
      const threadId = await getOrCreateTopicForUser(
        bot.api,
        freshGroup,
        ctx.currentBotUser,
      );

      if (threadId === null) {
        debug('话题创建失败，回退到私聊转发');
        await fallbackForwardToOwner(
          ctx,
          ownerBotUser,
          message,
          messageContent,
          messageType,
        );
      } else {
        // 将用户消息转发到对应话题
        const forwarded = await bot.api.forwardMessage(
          freshGroup.id,
          ctx.chat.id,
          message.message_id,
          { message_thread_id: threadId } as any,
        );

        debug(
          `✅ 用户 ${ctx.currentBotUser.id} 的消息已转发到话题 ${threadId}`,
        );

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
                forwardedToChatId: freshGroup.id,
              },
            },
          );
        }
      }
    } catch (fwdErr: any) {
      debug('话题模式转发失败:', fwdErr?.message || fwdErr?.description);
    }

    await next();
    return;
  }

  // 话题模式下，非 owner 在其他群组发消息（没有权限）→ 直接忽略
  // if (isTopicMode && !isOwner && ctx.chat?.type !== 'private') {
  //   await next();
  //   return;
  // }

  // ────────────────────────────────────────────────────────
  // 分支 C：非话题模式 — 原有私聊转发逻辑
  // ────────────────────────────────────────────────────────

  // C1: owner 回复消息时，转发给原始用户
  if (isOwner && message?.reply_to_message) {
    try {
      const replyMsg = message.reply_to_message as any;

      if (replyMsg.forward_from || replyMsg.forward_from_chat) {
        const originalUserId: number | undefined = replyMsg.forward_from?.id;

        if (originalUserId) {
          const bot = setupBot(ctx.currentBot.token);

          let originalBotUser: any = null;
          try {
            originalBotUser = await BotUser.findOne({
              id: originalUserId.toString(),
            });
          } catch (err) {
            console.error('获取原始用户信息失败:', err);
          }

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

  // C2: 普通用户发消息，转发给 owner 私聊
  if (!isOwner && message && ownerBotUser?.id) {
    await fallbackForwardToOwner(
      ctx,
      ownerBotUser,
      message,
      messageContent,
      messageType,
    );
  }

  const timestamp = new Date().toLocaleString('zh-CN');
  debug(
    `用户 ${
      ctx.from?.username || ctx.from?.id
    } 在 ${timestamp} 发来了 ${messageType} 类型消息: ${messageContent}`,
  );

  await next();
};

// ────────────────────────────────────────────────────────────
// 辅助：回退到私聊转发（话题模式失败时使用）
// ────────────────────────────────────────────────────────────
async function fallbackForwardToOwner(
  ctx: MyContext,
  ownerBotUser: any,
  message: any,
  messageContent: string | undefined,
  messageType: string,
): Promise<void> {
  console.log('messageType', messageType);

  try {
    const bot = setupBot(ctx.currentBot.token);
    const forwarded = await bot.api.forwardMessage(
      ownerBotUser.id,
      ctx.chat.id,
      message.message_id,
    );
    debug(
      `✅ 用户 ${ctx.currentBotUser.id} 的消息已转发给 owner: ${ownerBotUser.id}`,
    );

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

export default logger;
