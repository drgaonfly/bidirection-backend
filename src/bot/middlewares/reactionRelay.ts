// src/bot/middlewares/reactionRelay.ts
//
// 双向 reaction（点赞）转发：
//   - owner 给某条消息点赞  → 找到该消息对应的原始客户消息 → 在客户那边的 chat 里给原消息设置同样的 reaction
//   - 客户给某条消息点赞    → 找到该消息转发给 owner 的那条 → 在 owner 的 chat 里设置同样的 reaction
//
// Telegram 要求 webhook 的 allowed_updates 里包含 "message_reaction"。

import { Bot } from 'grammy';
import type { ReactionType } from 'grammy/types';
import BotMessage from '../../models/botMessage';
import BotUser from '../../models/botUser';
import Bot_ from '../../models/bot';
import createDebug from 'debug';

const debug = createDebug('bot:reactionRelay');

/**
 * 注册 message_reaction 事件处理器到指定 bot 实例。
 * 在 setupBot 里调用一次即可。
 */
export function registerReactionRelay(bot: Bot<any>): void {
  bot.on('message_reaction', async (ctx) => {
    try {
      const reaction = ctx.messageReaction;
      if (!reaction) return;

      const reactorUserId = reaction.user?.id;
      const messageId = reaction.message_id;
      const chatId = reaction.chat.id;
      // new_reaction 是当前设置的 reactions 数组（空数组表示取消所有）
      const newReactions: ReactionType[] = (reaction.new_reaction as any) ?? [];

      debug(
        `[reaction] user=${reactorUserId} chat=${chatId} msg=${messageId} reactions=${JSON.stringify(
          newReactions,
        )}`,
      );

      if (!reactorUserId) return;

      // 找到当前 bot 对应的数据库记录
      const currentBot = await Bot_.findOne({ token: bot.token });
      if (!currentBot || currentBot.isCreatedByAdmin) return;

      // 获取 owner 的 BotUser
      let ownerBotUser: any = null;
      if (currentBot.owner) {
        ownerBotUser = await BotUser.findById(currentBot.owner).lean();
      }
      if (!ownerBotUser) return;

      const isOwner = String(reactorUserId) === String(ownerBotUser.id);

      if (isOwner) {
        // ── owner 点赞 → 找到转发给 owner 那条消息的原始客户消息 ──────────
        // owner 看到的是 forwardedMessageId，原始消息存在 telegramMessageId
        const record = await BotMessage.findOne({
          bot: currentBot._id,
          forwardedMessageId: messageId,
          forwardedToChatId: Number(reactorUserId),
          isOwnerReply: { $ne: true },
        }).lean();

        if (!record) {
          debug(
            '[reaction] owner: no matching record found for forwardedMessageId=%d',
            messageId,
          );
          return;
        }

        // 找原始客户的 BotUser 拿到其 telegram id
        const customerBotUser = await BotUser.findById(record.botUser).lean();
        if (!customerBotUser?.id) return;

        debug(
          `[reaction] owner → customer ${customerBotUser.id}, originalMsgId=${record.telegramMessageId}`,
        );

        await setReaction(
          bot,
          Number(customerBotUser.id),
          record.telegramMessageId!,
          newReactions,
        );
      } else {
        // ── 客户点赞 → 找到客户这条消息转发给 owner 的那条 ──────────────
        const record = await BotMessage.findOne({
          bot: currentBot._id,
          telegramMessageId: messageId,
          isOwnerReply: { $ne: true },
        }).lean();

        if (!record?.forwardedMessageId || !record?.forwardedToChatId) {
          debug(
            '[reaction] customer: no forwarded record for telegramMessageId=%d',
            messageId,
          );
          return;
        }

        debug(
          `[reaction] customer → owner ${record.forwardedToChatId}, forwardedMsgId=${record.forwardedMessageId}`,
        );

        await setReaction(
          bot,
          record.forwardedToChatId,
          record.forwardedMessageId,
          newReactions,
        );
      }
    } catch (err: any) {
      debug('[reaction] error:', err?.message || err);
    }
  });
}

/**
 * 调用 setMessageReaction API 给指定消息设置 reaction。
 * newReactions 为空数组时表示移除所有 reaction。
 */
async function setReaction(
  bot: Bot<any>,
  chatId: number,
  messageId: number,
  reactions: ReactionType[],
): Promise<void> {
  try {
    await bot.api.setMessageReaction(chatId, messageId, reactions);
    debug(`✅ reaction 已设置 chatId=${chatId} msgId=${messageId}`);
  } catch (err: any) {
    debug(`❌ setMessageReaction 失败: ${err?.description || err?.message}`);
  }
}
