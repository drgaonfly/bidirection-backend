// src/bot/middlewares/topicSetup.ts
/**
 * 话题模式引导中间件
 *
 * 交互方式：单条消息 + inline keyboard，点按钮推进步骤，无需多次发命令。
 *
 * 命令：
 *  /setup_topics   — 在群组中发送，显示当前步骤卡片
 *  /use_this_group — 将当前已完成配置的群组设为激活话题群组
 *
 * Callback：
 *  topic_setup_next:<groupId>  — 点「✅ 我已完成，检测下一步」时触发
 *  topic_setup_done:<groupId>  — 配置完成后的确认按钮
 *
 * 事件：
 *  my_chat_member — 机器人加入群组时，私聊通知 owner 启动引导
 */

import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../types';
import BotUser from '../../models/botUser';
import Bot from '../../models/bot';
import Group from '../../models/group';
import { refreshTopicSetupState } from '../services/topicService';
import { checkGroup } from './checkGroup';
import createDebug from 'debug';

const debug = createDebug('bot:topicSetup');
const topicSetupComposer = new Composer<MyContext>();

// ─────────────────────────────────────────────────────────────
// 步骤文案
// ─────────────────────────────────────────────────────────────
function stepText(step: number, botUsername: string): string {
  const steps = [
    // step 0
    [
      '📋 *话题模式配置 — 第 1 步 / 共 4 步*',
      '',
      '需要将群组设置为**公开群组**（有 @username）。',
      '',
      '操作方法：',
      '1. 打开群组设置（点击群名称 → 编辑）',
      '2. 点击「群组类型」→ 选择「公开群组」',
      '3. 设置唯一的 @username',
      '4. 保存',
    ],
    // step 1
    [
      '📋 *话题模式配置 — 第 2 步 / 共 4 步*',
      '',
      '请开启群组的「话题」（Forum）模式。',
      '',
      '操作方法：',
      '1. 打开群组设置（点击群名称 → 编辑）',
      '2. 找到「话题」开关并启用',
      '3. 保存',
    ],
    // step 2
    [
      '📋 *话题模式配置 — 第 3 步 / 共 4 步*',
      '',
      `请将 @${botUsername} 设置为管理员。`,
      '',
      '操作方法：',
      '1. 打开群组成员列表',
      `2. 找到 @${botUsername} → 设置为管理员`,
      '3. 保存',
    ],
    // step 3
    [
      '📋 *话题模式配置 — 第 4 步 / 共 4 步*',
      '',
      `请赋予 @${botUsername}「管理话题」权限。`,
      '',
      '操作方法：',
      '1. 打开群管理员列表',
      `2. 点击 @${botUsername} 的权限`,
      '3. 开启「管理话题」',
      '4. 保存',
    ],
  ];

  return steps[step]?.join('\n') ?? '';
}

function doneText(): string {
  return [
    '🎉 *话题模式配置完成！*',
    '',
    '每位用户发消息时，机器人会在本群自动创建对应话题。',
    '切换不同话题即可与不同用户分别通信。',
    '',
    '多群组提示：如需切换激活的话题群组，可在目标群组发送 /use\\_this\\_group。',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// inline keyboard 构建
// ─────────────────────────────────────────────────────────────
function nextButton(groupId: string): InlineKeyboard {
  return new InlineKeyboard().text(
    '✅ 我已完成，检测下一步',
    `topic_setup_next:${groupId}`,
  );
}

function doneButton(): InlineKeyboard {
  return new InlineKeyboard().text('🎉 知道了', 'topic_setup_close');
}

// ─────────────────────────────────────────────────────────────
// 机器人被加入群组 → 私聊通知 owner 启动引导
// ─────────────────────────────────────────────────────────────
topicSetupComposer.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember?.new_chat_member?.status;
  const chatType = ctx.chat?.type;

  if (chatType !== 'group' && chatType !== 'supergroup') return;
  if (newStatus !== 'member' && newStatus !== 'administrator') return;
  if (ctx.currentBot?.isCreatedByAdmin) return;

  debug('机器人被加入群组 chatId=%s', ctx.chat?.id);

  const ownerBotUser = ctx.currentBot?.owner
    ? await BotUser.findById(ctx.currentBot.owner).lean()
    : null;
  if (!ownerBotUser?.id) return;

  const group = ctx.currentGroup;
  if (!group) return;

  const botInfo = await ctx.api.getMe();
  const groupTitle = ctx.chat?.title ?? '群组';

  try {
    await ctx.api.sendMessage(
      Number(ownerBotUser.id),
      [
        `🤖 机器人已被加入群组「${groupTitle}」`,
        '',
        '建议开启**话题模式**，让每位用户拥有独立话题，方便分别通信。',
        '',
        stepText(0, botInfo.username ?? '机器人'),
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        reply_markup: nextButton(String(group._id)),
      },
    );
  } catch (err: any) {
    debug('通知 owner 失败:', err?.description ?? err?.message);
  }
});

// ─────────────────────────────────────────────────────────────
// /setup_topics — 在群组中发送，展示当前步骤
// ─────────────────────────────────────────────────────────────
topicSetupComposer.command('setup_topics', checkGroup, async (ctx) => {
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
    ctx.currentBot._id,
  );

  if (step === 4) {
    await ctx.reply(doneText(), {
      parse_mode: 'Markdown',
      reply_markup: doneButton(),
    });
    return;
  }

  await ctx.reply(stepText(step, botInfo.username ?? '机器人'), {
    parse_mode: 'Markdown',
    reply_markup: nextButton(String(group._id)),
  });
});

// ─────────────────────────────────────────────────────────────
// callback: topic_setup_next:<groupId>
// 用户点「我已完成」→ 实时检测 → 更新消息内容到下一步
// ─────────────────────────────────────────────────────────────
topicSetupComposer.callbackQuery(/^topic_setup_next:/, async (ctx) => {
  const groupId = ctx.callbackQuery.data.split(':')[1];
  const group = await Group.findById(groupId);
  if (!group) {
    await ctx.answerCallbackQuery({
      text: '❌ 找不到对应群组，请重试。',
      show_alert: true,
    });
    return;
  }

  const botInfo = await ctx.api.getMe();
  const step = await refreshTopicSetupState(
    ctx.api,
    group,
    botInfo.id,
    ctx.currentBot._id,
  );

  debug(`[callback] groupId=${groupId} step=${step}`);

  if (step === 4) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(doneText(), {
      parse_mode: 'Markdown',
      reply_markup: doneButton(),
    });
    return;
  }

  // 直接展示当前实时步骤，内容未变则说明条件尚未满足
  try {
    await ctx.editMessageText(stepText(step, botInfo.username ?? '机器人'), {
      parse_mode: 'Markdown',
      reply_markup: nextButton(groupId),
    });
    await ctx.answerCallbackQuery();
  } catch (err: any) {
    if (err?.description?.includes('message is not modified')) {
      await ctx.answerCallbackQuery({
        text: '⚠️ 检测未通过，请确认操作已完成后再试。',
        show_alert: true,
      });
    } else {
      throw err;
    }
  }
});

// ─────────────────────────────────────────────────────────────
// callback: topic_setup_close — 完成后关闭卡片
// ─────────────────────────────────────────────────────────────
topicSetupComposer.callbackQuery('topic_setup_close', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {
    // 消息可能已过期，忽略删除失败
  });
});

// ─────────────────────────────────────────────────────────────
// /use_this_group — 切换激活话题群组
// ─────────────────────────────────────────────────────────────
topicSetupComposer.command('use_this_group', checkGroup, async (ctx) => {
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
      '❌ 本群组尚未完成话题模式配置，请先发送 /setup\\_topics。',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  await Bot.findByIdAndUpdate(ctx.currentBot._id, {
    activeTopicGroup: group._id,
  });
  debug('bot %s 切换 activeTopicGroup → 群组 %s', ctx.currentBot._id, group.id);
  await ctx.reply(`✅ 已将「${group.title}」设为当前激活话题群组。`);
});

// ─────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────
async function checkIsOwner(ctx: MyContext): Promise<boolean> {
  if (!ctx.currentBot?.owner) return false;
  const ownerBotUser = await BotUser.findById(ctx.currentBot.owner).lean();
  return ownerBotUser?.id === ctx.currentBotUser?.id;
}

export default topicSetupComposer;
