// src/bot/middlewares/reactionRelay.ts
//
// 双向 reaction（点赞）转发，作为独立函数直接处理 message_reaction update，
// 不依赖 grammY 中间件链（因为 message_reaction update 缺少 ctx.from 等字段，
// 会导致 botUserResolver 等中间件崩溃）。
//
// Telegram webhook 的 allowed_updates 必须包含 "message_reaction"。

import { Api } from 'grammy';
import type { Update, ReactionType } from 'grammy/types';
import BotMessage from '../../models/botMessage';
import BotUser from '../../models/botUser';
import Bot_ from '../../models/bot';
import { setupBot } from '../botSetup';
import createDebug from 'debug';

const debug = createDebug('bot:reactionRelay');

/**
 * 处理 message_reaction update，执行双向 reaction 转发。
 * 在 botWebhookController 里直接调用，绕过中间件链。
 *
 * @param botToken  当前 bot 的 token
 * @param update    Telegram Update 对象（类型为 message_reaction）
 */
export async function handleReactionUpdate(
  botToken: string,
  update: Update,
): Promise<void> {
  const reaction = update.message_reaction;
  if (!reaction) return;

  const reactorUserId = reaction.user?.id;
  const messageId = reaction.message_id;
  // new_reaction 为空数组表示取消所有 reaction
  const newReactions: ReactionType[] = reaction.new_reaction ?? [];

  debug(
    `[reaction] user=${reactorUserId} msg=${messageId} reactions=${JSON.stringify(
      newReactions,
    )}`,
  );

  if (!reactorUserId) return;

  try {
    // 找到当前 bot 的数据库记录
    const currentBot = await Bot_.findOne({ token: botToken });
    if (!currentBot || currentBot.isCreatedByAdmin) return;

    // 获取 owner 的 BotUser
    let ownerBotUser: any = null;
    if (currentBot.owner) {
      ownerBotUser = await BotUser.findById(currentBot.owner).lean();
    }
    if (!ownerBotUser) return;

    const isOwner = String(reactorUserId) === String(ownerBotUser.id);
    const bot = setupBot(botToken);

    if (isOwner) {
      // ── owner 点赞 → 找到对应的客户原始消息 → 在客户那边设置同样的 reaction ──
      // owner 看到的是 forwardedMessageId（转发过来的那条）
      const record = await BotMessage.findOne({
        bot: currentBot._id,
        forwardedMessageId: messageId,
        forwardedToChatId: Number(reactorUserId),
        isOwnerReply: { $ne: true },
      }).lean();

      if (!record) {
        debug(
          '[reaction] owner: no record found for forwardedMessageId=%d',
          messageId,
        );
        return;
      }

      const customerBotUser = await BotUser.findById(record.botUser).lean();
      if (!customerBotUser?.id) return;

      debug(
        `[reaction] owner → customer ${customerBotUser.id}, originalMsgId=${record.telegramMessageId}`,
      );

      await setReaction(
        bot.api,
        Number(customerBotUser.id),
        record.telegramMessageId!,
        newReactions,
      );
    } else {
      // ── 客户点赞 → 找到该消息转发给 owner 的那条 → 在 owner 那边设置同样的 reaction ──
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
        bot.api,
        record.forwardedToChatId,
        record.forwardedMessageId,
        newReactions,
      );
    }
  } catch (err: any) {
    debug('[reaction] error:', err?.message || err);
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
    debug(`✅ reaction 已同步 chatId=${chatId} msgId=${messageId}`);
  } catch (err: any) {
    debug(`❌ setMessageReaction 失败: ${err?.description || err?.message}`);
  }
}
