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
import createDebug from 'debug';

const debug = createDebug('bot:reactionRelay');

export async function handleReactionUpdate(
  botToken: string,
  update: Update,
): Promise<void> {
  const reaction = update.message_reaction;
  if (!reaction) return;

  const reactorUserId = reaction.user?.id;
  const messageId = reaction.message_id;
  const newReactions: ReactionType[] = reaction.new_reaction ?? [];

  debug(
    `[reaction] user=${reactorUserId} msg=${messageId} reactions=${JSON.stringify(
      newReactions,
    )}`,
  );

  if (!reactorUserId) return;

  try {
    const currentBot = await Bot_.findOne({ token: botToken });
    if (!currentBot || currentBot.isCreatedByAdmin) return;

    const ownerBotUser = currentBot.owner
      ? await BotUser.findById(currentBot.owner).lean()
      : null;
    if (!ownerBotUser) return;

    const isOwner = String(reactorUserId) === String(ownerBotUser.id);
    const api = setupBot(botToken).api;

    if (isOwner) {
      // owner 点赞的是「客户消息被 forwardMessage 转发给 owner 的那条」
      // → forwardedMessageId = messageId, isOwnerReply = false
      const record = await BotMessage.findOne({
        bot: currentBot._id,
        forwardedMessageId: messageId,
        isOwnerReply: false,
      }).lean();

      if (!record) {
        debug(
          '[reaction] owner: no record for forwardedMessageId=%d',
          messageId,
        );
        return;
      }

      // 找到原始客户的 telegram id
      const customerBotUser = await BotUser.findById(record.botUser).lean();
      if (!customerBotUser?.id) return;

      debug(
        `[reaction] owner → customer=${customerBotUser.id} msgId=${record.telegramMessageId}`,
      );

      // 在客户那边的原始消息上设置 reaction
      await setReaction(
        api,
        Number(customerBotUser.id),
        record.telegramMessageId!,
        newReactions,
      );
    } else {
      // 客户点赞的是「owner 回复后 copyMessage 给客户的那条」
      // → forwardedMessageId = messageId, isOwnerReply = true
      const record = await BotMessage.findOne({
        bot: currentBot._id,
        forwardedMessageId: messageId,
        isOwnerReply: true,
      }).lean();

      if (!record) {
        debug(
          '[reaction] customer: no record for forwardedMessageId=%d',
          messageId,
        );
        return;
      }

      debug(
        `[reaction] customer → owner=${ownerBotUser.id} msgId=${record.telegramMessageId}`,
      );

      // 在 owner 那边的原始消息上设置 reaction
      await setReaction(
        api,
        Number(ownerBotUser.id),
        record.telegramMessageId!,
        newReactions,
      );
    }
  } catch (err: any) {
    debug('[reaction] error: %s', err?.message || err);
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
    debug(`✅ reaction synced chatId=${chatId} msgId=${messageId}`);
  } catch (err: any) {
    debug(`❌ setMessageReaction failed: ${err?.description || err?.message}`);
  }
}
