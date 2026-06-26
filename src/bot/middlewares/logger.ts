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
import { resolveTopicMode } from './checkTopicSubscription';
import { isBotOwner } from '../commands/user/subscribe/helpers';

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
// 构建发往话题的消息头（owner inline mention + 发送者名称）
// 格式：
//   👤 Melanie Adams
//   消息内容
//
// ownerMention 使用零宽空格作为链接文字，视觉不可见，
// 但 Telegram 识别为真实 mention，会累加群组角标。
// ────────────────────────────────────────────────────────────
function buildHeader(ownerBotUser: any, senderBotUser: any): string {
  const senderName =
    [senderBotUser.firstName, senderBotUser.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    senderBotUser.userName ||
    `用户 ${senderBotUser.id}`;

  const ownerMention = `<a href="tg://user?id=${ownerBotUser.id}">\u200b</a>`;
  const senderMention = `<a href="tg://user?id=${senderBotUser.id}">${senderName}</a>`;

  return `${ownerMention}👤 ${senderMention}`;
}

// ────────────────────────────────────────────────────────────
// 将用户消息发送到群组话题（sendMessage/sendPhoto/... 替代 forwardMessage）
// 返回发出消息的 message_id，失败返回 undefined
// ────────────────────────────────────────────────────────────
async function sendToTopic(
  botApi: any,
  groupId: number,
  threadId: number,
  message: any,
  header: string,
): Promise<number | undefined> {
  const opts = {
    message_thread_id: threadId,
    parse_mode: 'HTML' as const,
    disable_notification: false,
  } as any;

  const silentOpts = {
    message_thread_id: threadId,
    disable_notification: true,
  } as any;

  try {
    if (message.text) {
      const sent = await botApi.sendMessage(
        groupId,
        `${header}\n${message.text}`,
        opts,
      );
      return sent.message_id;
    }

    if (message.photo) {
      const fileId = message.photo[message.photo.length - 1].file_id;
      const sent = await botApi.sendPhoto(groupId, fileId, {
        ...opts,
        caption: `${header}\n${message.caption ?? ''}`.trimEnd(),
      });
      return sent.message_id;
    }

    if (message.video) {
      const sent = await botApi.sendVideo(groupId, message.video.file_id, {
        ...opts,
        caption: `${header}\n${message.caption ?? ''}`.trimEnd(),
      });
      return sent.message_id;
    }

    if (message.voice) {
      const sent = await botApi.sendVoice(groupId, message.voice.file_id, {
        ...opts,
        caption: `${header}\n[语音消息]`,
      });
      return sent.message_id;
    }

    if (message.document) {
      const sent = await botApi.sendDocument(
        groupId,
        message.document.file_id,
        {
          ...opts,
          caption: `${header}\n${message.caption ?? ''}`.trimEnd(),
        },
      );
      return sent.message_id;
    }

    if (message.sticker) {
      // sticker 不支持 caption，先发标题再发 sticker
      await botApi.sendMessage(groupId, `${header}\n[贴纸]`, opts);
      const sent = await botApi.sendSticker(
        groupId,
        message.sticker.file_id,
        silentOpts,
      );
      return sent.message_id;
    }

    if (message.location) {
      await botApi.sendMessage(groupId, `${header}\n[位置]`, opts);
      const sent = await botApi.sendLocation(
        groupId,
        message.location.latitude,
        message.location.longitude,
        silentOpts,
      );
      return sent.message_id;
    }

    // 其他类型兜底
    const sent = await botApi.sendMessage(groupId, `${header}\n[消息]`, opts);
    return sent.message_id;
  } catch (err: any) {
    debug('sendToTopic 失败:', err?.description || err?.message);
    return undefined;
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
  let isCurrentUserOwner = false;
  let ownerBotUser: any = null;
  if (ctx.currentBot.owner) {
    ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
    isCurrentUserOwner = await isBotOwner(ctx);
  }

  debug(
    `[Logger] user ${ctx.currentBotUser.id}, isOwner: ${isCurrentUserOwner}`,
  );

  // ── 话题模式准入：三条件统一判断 ────────────────────────
  const botDoc = await Bot.findById(ctx.currentBot._id)
    .populate('activeTopicGroup')
    .select(
      'activeTopicGroup isTopicModeEnabled topicSubscriptionExpiredAt topicTrialStartedAt createdAt',
    )
    .lean();

  const topicGroup = resolveTopicMode(
    botDoc,
    ownerBotUser,
    ctx.currentProxyUser,
  );
  const isTopicMode = !!topicGroup;

  debug(
    `[Logger] topicGroup: ${
      topicGroup ? topicGroup.id : null
    }, isTopicMode: ${isTopicMode}`,
  );

  // ────────────────────────────────────────────────────────
  // 分支 A：话题模式 + owner 在群组话题中发消息 → 转发给对应用户
  // ────────────────────────────────────────────────────────
  if (
    isTopicMode &&
    isCurrentUserOwner &&
    message?.message_thread_id &&
    ctx.chat?.type !== 'private'
  ) {
    const threadId = message.message_thread_id;
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
  // 分支 B：话题模式 + 普通用户私聊发消息 → 发送到群组对应话题
  // ────────────────────────────────────────────────────────
  if (isTopicMode && !isCurrentUserOwner && message && ownerBotUser?.id) {
    try {
      const bot = setupBot(ctx.currentBot.token);

      // 重新从数据库获取 topicGroup，确保 botUserTopics 是最新的
      const freshGroup = await Group.findById(topicGroup._id);
      if (!freshGroup) throw new Error('话题群组不存在');

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
        const header = buildHeader(ownerBotUser, ctx.currentBotUser);
        const sentMsgId = await sendToTopic(
          bot.api,
          freshGroup.id,
          threadId,
          message,
          header,
        );

        debug(
          `✅ 用户 ${ctx.currentBotUser.id} 的消息已发送到话题 ${threadId}`,
        );

        if (messageContent && sentMsgId !== undefined) {
          await BotMessage.findOneAndUpdate(
            {
              bot: ctx.currentBot._id,
              botUser: ctx.currentBotUser._id,
              telegramMessageId: message.message_id,
            },
            {
              $set: {
                forwardedMessageId: sentMsgId,
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

  // 话题模式下，非 owner 在群组里发消息 → 忽略
  if (isTopicMode && !isCurrentUserOwner && ctx.chat?.type !== 'private') {
    await next();
    return;
  }

  // ────────────────────────────────────────────────────────
  // 分支 C：非话题模式 — 原有私聊转发逻辑
  // ────────────────────────────────────────────────────────

  // C1: owner 回复消息时，转发给原始用户
  if (isCurrentUserOwner && message?.reply_to_message) {
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
  if (!isCurrentUserOwner && message && ownerBotUser?.id) {
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
