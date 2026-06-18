// src/bot/middlewares/reactionRelay.ts
//
// 双向 reaction 转发逻辑：
//
// 数据库里有两种消息记录：
//
//   isOwnerReply=false（客户发的）：
//     telegramMessageId  = 客户那边的原始消息 id
//     forwardedMessageId = forwardMessage 后 owner 那边的消息 id
//     forwardedToChatId  = owner 的 telegram id
//
//   isOwnerReply=true（owner 回复的）：
//     telegramMessageId  = owner 那边的原始消息 id
//     forwardedMessageId = copyMessage 后客户那边的消息 id
//     forwardedToChatId  = 客户的 telegram id
//
// reaction 转发规则：
//
//   owner 点赞某条消息（message_id=X）：
//     → X 是 forwardedMessageId（客户消息转发给 owner 的那条），isOwnerReply=false
//     → 找到记录，取 telegramMessageId + 客户 BotUser.id → 在客户那边设置 reaction
//
//   客户点赞某条消息（message_id=Y）：
//     → Y 是 forwardedMessageId（owner 回复 copy 给客户的那条），isOwnerReply=true
//     → 找到记录，取 telegramMessageId + ownerBotUser.id → 在 owner 那边设置 reaction

import { Api } from 'grammy';
import type { Update, ReactionType } from 'grammy/types';
import BotMessage from '../../models/botMessage';
import BotUser from '../../models/botUser';
import Bot_ from '../../models/bot';
import { setupBot } from '../botSetup';

export async function handleReactionUpdate(
  botToken: string,
  update: Update,
): Promise<void> {
  const reaction = update.message_reaction;
  if (!reaction) return;

  const reactorUserId = reaction.user?.id;
  const messageId = reaction.message_id;
  const newReactions: ReactionType[] = reaction.new_reaction ?? [];

  console.log(
    `[reaction] user=${reactorUserId} msg=${messageId} reactions=${JSON.stringify(
      newReactions,
    )}`,
  );

  if (!reactorUserId) {
    console.log('[reaction] reactorUserId is undefined, skipping');
    return;
  }

  try {
    const currentBot = await Bot_.findOne({ token: botToken });
    if (!currentBot) {
      console.log('[reaction] bot not found for token');
      return;
    }
    if (currentBot.isCreatedByAdmin) {
      console.log('[reaction] bot isCreatedByAdmin, skipping');
      return;
    }

    const ownerBotUser = currentBot.owner
      ? await BotUser.findById(currentBot.owner).lean()
      : null;
    if (!ownerBotUser) {
      console.log('[reaction] ownerBotUser not found');
      return;
    }

    const isOwner = String(reactorUserId) === String(ownerBotUser.id);
    console.log(
      `[reaction] reactorUserId=${reactorUserId} ownerBotUser.id=${ownerBotUser.id} isOwner=${isOwner}`,
    );

    const api = setupBot(botToken).api;

    if (isOwner) {
      // owner 点赞的是「客户消息被 forwardMessage 转发给 owner 的那条」
      const record = await BotMessage.findOne({
        bot: currentBot._id,
        forwardedMessageId: messageId,
        isOwnerReply: false,
      }).lean();

      console.log(
        `[reaction] owner lookup: forwardedMessageId=${messageId} isOwnerReply=false → record=${JSON.stringify(
          record
            ? {
                _id: record._id,
                telegramMessageId: record.telegramMessageId,
                forwardedMessageId: record.forwardedMessageId,
                botUser: record.botUser,
              }
            : null,
        )}`,
      );

      if (!record) return;

      const customerBotUser = await BotUser.findById(record.botUser).lean();
      console.log(
        `[reaction] customerBotUser=${customerBotUser?.id} telegramMessageId=${record.telegramMessageId}`,
      );

      if (!customerBotUser?.id) return;

      await setReaction(
        api,
        Number(customerBotUser.id),
        record.telegramMessageId!,
        newReactions,
      );
    } else {
      // 客户点赞的是「owner 回复后 copyMessage 给客户的那条」
      const record = await BotMessage.findOne({
        bot: currentBot._id,
        forwardedMessageId: messageId,
        isOwnerReply: true,
      }).lean();

      console.log(
        `[reaction] customer lookup: forwardedMessageId=${messageId} isOwnerReply=true → record=${JSON.stringify(
          record
            ? {
                _id: record._id,
                telegramMessageId: record.telegramMessageId,
                forwardedMessageId: record.forwardedMessageId,
              }
            : null,
        )}`,
      );

      if (!record) return;

      console.log(
        `[reaction] customer → owner=${ownerBotUser.id} msgId=${record.telegramMessageId}`,
      );

      await setReaction(
        api,
        Number(ownerBotUser.id),
        record.telegramMessageId!,
        newReactions,
      );
    }
  } catch (err: any) {
    console.error('[reaction] error:', err?.message || err?.description || err);
  }
}

async function setReaction(
  api: Api,
  chatId: number,
  messageId: number,
  reactions: ReactionType[],
): Promise<void> {
  try {
    await api.setMessageReaction(chatId, messageId, reactions);
    console.log(`[reaction] ✅ synced chatId=${chatId} msgId=${messageId}`);
  } catch (err: any) {
    console.error(
      `[reaction] ❌ setMessageReaction failed chatId=${chatId} msgId=${messageId}:`,
      err?.description || err?.message,
    );
  }
}
