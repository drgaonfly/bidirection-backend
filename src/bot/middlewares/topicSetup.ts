// src/bot/middlewares/topicSetup.ts
/**
 * 话题模式引导中间件
 *
 * 命令：
 *  /setup_topics  — 逐步检测并引导配置（群组中使用）
 *  /use_this_group — 将当前群组设为激活话题群组（多群组切换）
 *
 * 事件：
 *  my_chat_member — 机器人被加入群组时私聊通知 owner 第 1 步
 */

import { Composer } from 'grammy';
import { MyContext } from '../types';
import BotUser from '../../models/botUser';
import Bot from '../../models/bot';
import {
  refreshTopicSetupState,
  getSetupGuideMessage,
} from '../services/topicService';
import createDebug from 'debug';

const debug = createDebug('bot:topicSetup');
const topicSetupComposer = new Composer<MyContext>();

// ── 机器人被加入群组时，私聊通知 owner ────────────────────────
topicSetupComposer.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember?.new_chat_member?.status;
  const chatType = ctx.chat?.type;

  if (chatType !== 'group' && chatType !== 'supergroup') return;
  if (newStatus !== 'member' && newStatus !== 'administrator') return;
  if (ctx.currentBot?.isCreatedByAdmin) return;

  debug('机器人被加入群组, chatId=%s', ctx.chat?.id);
  await notifyOwner(ctx, 0);
});

// ── /setup_topics：检测当前状态并给出下一步引导 ───────────────
topicSetupComposer.command('setup_topics', async (ctx) => {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('请在您希望配置话题模式的群组中发送此命令。');
    return;
  }
  if (ctx.currentBot?.isCreatedByAdmin) return;

  if (!(await checkIsOwner(ctx))) {
    await ctx.reply('❌ 只有机器人拥有者才能配置话题模式。');
    return;
  }

  const group = ctx.currentGroup;
  if (!group) {
    await ctx.reply('❌ 无法获取群组信息，请稍后重试。');
    return;
  }

  const botInfo = await ctx.api.getMe();
  const step = await refreshTopicSetupState(
    ctx.api,
    group,
    botInfo.id,
    ctx.currentBot._id, // 传入 botMongoId，完成时自动写 activeTopicGroup
  );
  const guideMsg = getSetupGuideMessage(step, botInfo.username || '机器人');

  await ctx.reply(guideMsg, { parse_mode: 'Markdown' });
  await notifyOwner(ctx, step);
});

// ── /use_this_group：将当前群组设为激活话题群组 ───────────────
topicSetupComposer.command('use_this_group', async (ctx) => {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('请在目标话题群组中发送此命令。');
    return;
  }
  if (ctx.currentBot?.isCreatedByAdmin) return;

  if (!(await checkIsOwner(ctx))) {
    await ctx.reply('❌ 只有机器人拥有者才能切换话题群组。');
    return;
  }

  const group = ctx.currentGroup;
  if (!group || group.setupStep !== 4) {
    await ctx.reply(
      '❌ 本群组尚未完成话题模式配置。\n请先发送 /setup\\_topics 完成配置。',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  await Bot.findByIdAndUpdate(ctx.currentBot._id, {
    activeTopicGroup: group._id,
  });

  debug('bot %s 切换 activeTopicGroup 为群组 %s', ctx.currentBot._id, group.id);
  await ctx.reply(`✅ 已将「${group.title}」设为当前激活话题群组。`);
});

// ────────────────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────────────────

async function checkIsOwner(ctx: MyContext): Promise<boolean> {
  const currentBot = ctx.currentBot;
  if (!currentBot?.owner) return false;
  const ownerBotUser = await BotUser.findById(currentBot.owner).lean();
  return ownerBotUser?.id === ctx.currentBotUser?.id;
}

async function notifyOwner(ctx: MyContext, step: number): Promise<void> {
  const currentBot = ctx.currentBot;
  if (!currentBot?.owner || step === 4) return;

  const ownerBotUser = await BotUser.findById(currentBot.owner).lean();
  if (!ownerBotUser?.id) return;

  try {
    const botInfo = await ctx.api.getMe();
    const groupTitle = ctx.chat?.title ? `「${ctx.chat.title}」` : '您的群组';
    const header =
      step === 0
        ? `🤖 机器人已被加入群组 ${groupTitle}\n\n建议开启话题模式以便分用户通信：\n\n`
        : `📌 群组 ${groupTitle} 话题配置进度更新：\n\n`;

    await ctx.api.sendMessage(
      Number(ownerBotUser.id),
      header + getSetupGuideMessage(step, botInfo.username || '机器人'),
      { parse_mode: 'Markdown' },
    );
  } catch (err: any) {
    debug('通知 owner 失败:', err?.description || err?.message);
  }
}

export default topicSetupComposer;
