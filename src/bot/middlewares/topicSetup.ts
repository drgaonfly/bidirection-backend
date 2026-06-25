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
import Bot from '../../models/bot';
import BotUser from '../../models/botUser';
import Group from '../../models/group';
import User from '../../models/user';
import { refreshTopicSetupState } from '../services/topicService';
import { isTopicSubscriptionActive } from './checkTopicSubscription';
import { checkGroup } from './checkGroup';
import { checkBotOwner } from './checkBotOwner';
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
      '📋 *话题模式配置 — 第 1 步 / 共 3 步*',
      '',
      '请开启群组的「话题」（Forum）模式。',
      '',
      '操作方法：',
      '1. 打开群组设置（点击群名称 → 编辑）',
      '2. 找到「话题」开关并启用',
      '3. 保存',
    ],
    // step 1
    [
      '📋 *话题模式配置 — 第 2 步 / 共 3 步*',
      '',
      `请将 @${botUsername} 设置为管理员。`,
      '',
      '注意：设置管理员会自动将群组升级为超级群组',
      '',
      '操作方法：',
      '1. 打开群组成员列表',
      `2. 找到 @${botUsername} → 设置为管理员`,
      '3. 保存',
    ],
    // step 2
    [
      '📋 *话题模式配置 — 第 3 步 / 共 3 步*',
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
// 机器人被加入群组 → 自动发送配置引导
// ─────────────────────────────────────────────────────────────
topicSetupComposer.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember?.new_chat_member?.status;
  const chatType = ctx.chat?.type;

  if (chatType !== 'group' && chatType !== 'supergroup') return;
  if (newStatus !== 'member' && newStatus !== 'administrator') return;
  if (ctx.currentBot?.isCreatedByAdmin) return;

  debug('机器人被加入群组 chatId=%s', ctx.chat?.id);

  // 先检查订阅状态，无月付无试用则不允许配置
  const bot = await Bot.findById(ctx.currentBot._id)
    .select('user owner topicSubscriptionExpiredAt topicTrialStartedAt')
    .lean();

  const proxyUser = await User.findById(bot?.user).lean();
  const ownerBotUser = await BotUser.findById(bot?.owner).lean();
  const isSubscriptionActive = isTopicSubscriptionActive(
    bot,
    ownerBotUser,
    proxyUser,
  );

  if (
    !isSubscriptionActive &&
    !(
      proxyUser?.topic_mode_trial_period > 0 &&
      !ownerBotUser?.topicTrialStartedAt
    )
  ) {
    // 无月付无试用，不允许配置
    debug('无月付无试用，不允许配置话题模式');
    try {
      await ctx.reply(
        '💡 *话题模式需要订阅才能使用*\n\n' +
          '您当前没有有效的订阅，也不再享有免费试用。\n\n' +
          '如需使用话题模式功能，请先订阅服务：\n' +
          '1. 私聊机器人\n' +
          '2. 点击「订阅」菜单\n' +
          '3. 选择订阅套餐',
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      debug('发送订阅提示失败:', err);
    }
    return;
  }

  // 等待 groupResolver 创建群组记录
  // 延迟一下确保群组记录已创建
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 重新获取群组信息
  const group = await Group.findOne({ id: ctx.chat?.id });
  if (!group) {
    debug('群组记录未找到，跳过配置引导');
    return;
  }

  // 检查配置状态
  const botInfo = await ctx.api.getMe();
  const result = await refreshTopicSetupState(
    ctx.api,
    group,
    botInfo.id,
    ctx.currentBot._id,
  );

  const step = result.step;
  debug('群组配置状态 step=%d', step);

  // 如果配置未完成，在群组中发送配置引导
  if (step < 3) {
    try {
      await ctx.reply(stepText(step, botInfo.username ?? '机器人'), {
        parse_mode: 'Markdown',
        reply_markup: nextButton(String(group._id)),
      });
      debug('已发送配置引导到群组');
    } catch (err) {
      debug('发送配置引导失败:', err);
    }
  } else if (result.needsTrialPrompt) {
    // 配置完成但需要提示用户开启试用
    try {
      await ctx.reply(
        '🎉 *话题模式配置完成！*\n\n' +
          '💡 您还未开启免费试用，请先开启试用才能使用话题模式功能。\n\n' +
          '操作方法：\n' +
          '1. 私聊机器人\n' +
          '2. 点击「订阅」菜单\n' +
          '3. 点击「开启免费试用」',
        { parse_mode: 'Markdown' },
      );
      debug('已发送试用提示到群组');
    } catch (err) {
      debug('发送试用提示失败:', err);
    }
  }
});

// ─────────────────────────────────────────────────────────────
// /setup_topics — 在群组中发送，展示当前步骤
// ─────────────────────────────────────────────────────────────
topicSetupComposer.command(
  'setup_topics',
  checkGroup,
  checkBotOwner,
  async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('请在您希望配置话题模式的群组中发送此命令。');
      return;
    }
    if (ctx.currentBot?.isCreatedByAdmin) return;

    const group = ctx.currentGroup;
    if (!group) {
      await ctx.reply('❌ 无法获取群组信息，请稍后重试。');
      return;
    }

    const botInfo = await ctx.api.getMe();
    const result = await refreshTopicSetupState(
      ctx.api,
      group,
      botInfo.id,
      ctx.currentBot._id,
    );

    const step = result.step;

    if (step === 3) {
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
  },
);

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
  const result = await refreshTopicSetupState(
    ctx.api,
    group,
    botInfo.id,
    ctx.currentBot._id,
  );

  const step = result.step;
  debug(`[callback] groupId=${groupId} step=${step}`);

  if (step === 3) {
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
topicSetupComposer.command(
  'use_this_group',
  checkGroup,
  checkBotOwner,
  async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('请在目标话题群组中发送此命令。');
      return;
    }
    if (ctx.currentBot?.isCreatedByAdmin) return;

    const group = ctx.currentGroup;
    if (!group || group.setupStep !== 3) {
      await ctx.reply(
        '❌ 本群组尚未完成话题模式配置，请先发送 /setup\\_topics。',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    await Bot.findByIdAndUpdate(ctx.currentBot._id, {
      activeTopicGroup: group._id,
    });
    debug(
      'bot %s 切换 activeTopicGroup → 群组 %s',
      ctx.currentBot._id,
      group.id,
    );
    await ctx.reply(`✅ 已将「${group.title}」设为当前激活话题群组。`);
  },
);

export default topicSetupComposer;
