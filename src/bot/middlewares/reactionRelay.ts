// src/bot/middlewares/reactionRelay.ts
//
// 双向 reaction 转发逻辑
//
// isOwnerReply=false（客户发的）：
//   telegramMessageId  = 客户原始消息 id
//   forwardedMessageId = forwardMessage 后 owner 那边的消息 id
//
// isOwnerReply=true（owner 回复的）：
//   telegramMessageId  = owner 原始消息 id
//   forwardedMessageId = copyMessage 后客户那边的消息 id
//
// owner 点赞  → 查 forwardedMessageId + isOwnerReply=false → 在客户原始消息设置 reaction
// 客户点赞    → 查 forwardedMessageId + isOwnerReply=true  → 在 owner 原始消息设置 reaction

import { Api } from 'grammy';
import type { Update, ReactionType } from 'grammy/types';
import { SocksProxyAgent } from 'socks-proxy-agent';
import BotMessage from '../../models/botMessage';
import BotUser from '../../models/botUser';
import Bot_ from '../../models/bot';

/**
 * 构建一个带正确代理配置的裸 API 实例，不走 setupBot（避免重复初始化 session/中间件）。
 */
function buildApi(token: string): Api {
  const SOCKS_PROXY_URL = process.env.SOCKS_PROXY_URL;
  if (SOCKS_PROXY_URL) {
    const agent = new SocksProxyAgent(SOCKS_PROXY_URL);
    return new Api(token, {
      baseFetchConfig: { agent, compress: true },
    });
  }
  return new Api(token);
}

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
      console.log('[reaction] bot not found');
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

    const api = buildApi(botToken);

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
