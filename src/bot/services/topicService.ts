// src/bot/services/topicService.ts
/**
 * 话题模式服务
 *
 * 配置步骤：
 *  0 = 群组未公开（无 @username），需先设置公开链接
 *  1 = 已公开 supergroup，但话题模式未开启
 *  2 = 话题模式已开，机器人不是管理员
 *  3 = 机器人是管理员但缺 can_manage_topics 权限
 *  4 = 全部完成
 *
 * 多群组支持：
 *  bot.activeTopicGroup 指向当前激活的话题群组。
 *  配置完成时若未设置则自动写入；owner 可在任意已完成群组发
 *  /use_this_group 来切换。
 */

import { Api } from 'grammy';
import Group, { IGroup, IBotUserTopic } from '../../models/group';
import Bot from '../../models/bot';
import { IBotUser } from '../../models/botUser';
import createDebug from 'debug';

const debug = createDebug('bot:topicService');

// ────────────────────────────────────────────────────────────
// 1. 实时检测机器人管理员状态
// ────────────────────────────────────────────────────────────
export interface BotAdminStatus {
  isAdmin: boolean;
  canManageTopics: boolean;
}

export async function checkBotAdminStatus(
  api: Api,
  chatId: number,
  botId: number,
): Promise<BotAdminStatus> {
  try {
    const member = await api.getChatMember(chatId, botId);
    if (member.status === 'administrator' || member.status === 'creator') {
      return {
        isAdmin: true,
        canManageTopics: !!(member as any).can_manage_topics,
      };
    }
    return { isAdmin: false, canManageTopics: false };
  } catch (err) {
    debug('checkBotAdminStatus error:', err);
    return { isAdmin: false, canManageTopics: false };
  }
}

// ────────────────────────────────────────────────────────────
// 2. 刷新并持久化群组的话题配置状态，返回最新 setupStep
// ────────────────────────────────────────────────────────────
export async function refreshTopicSetupState(
  api: Api,
  group: IGroup,
  botId: number,
  /** 传入 bot._id，完成时若无 activeTopicGroup 则自动写入 */
  botMongoId?: any,
): Promise<number> {
  const chatId = group.id;

  let chat: any;
  try {
    chat = await api.getChat(chatId);
  } catch (err) {
    debug('getChat 失败:', err);
    return group.setupStep;
  }

  const isPublic = !!(chat as any).username; // 有 @username = 公开
  const isSupergroup = chat.type === 'supergroup';
  const forumEnabled = !!(chat as any).is_forum;

  let isAdmin = false;
  let canManageTopics = false;
  if (isSupergroup) {
    const s = await checkBotAdminStatus(api, chatId, botId);
    isAdmin = s.isAdmin;
    canManageTopics = s.canManageTopics;
  }

  // 推导步骤
  let step = 0;
  if (isPublic && isSupergroup) step = 1;
  if (isPublic && isSupergroup && forumEnabled) step = 2;
  if (isPublic && isSupergroup && forumEnabled && isAdmin && !canManageTopics)
    step = 3;
  if (isPublic && isSupergroup && forumEnabled && isAdmin && canManageTopics)
    step = 4;

  // 持久化
  await Group.findByIdAndUpdate(group._id, {
    topicMode: forumEnabled,
    canManageTopics,
    setupStep: step,
  });

  // 同步内存对象
  group.topicMode = forumEnabled;
  group.canManageTopics = canManageTopics;
  group.setupStep = step;

  // 配置完成：若 bot 还没有 activeTopicGroup，自动写入
  if (step === 4 && botMongoId) {
    await Bot.findOneAndUpdate(
      { _id: botMongoId, activeTopicGroup: null },
      { activeTopicGroup: group._id },
    );
    debug(`bot ${botMongoId} activeTopicGroup 自动设为群组 ${group.id}`);
  }

  debug(
    `群组 ${chatId}: step=${step}, public=${isPublic}, forum=${forumEnabled}, admin=${isAdmin}, manageTopics=${canManageTopics}`,
  );
  return step;
}

// ────────────────────────────────────────────────────────────
// 3. 引导文案
// ────────────────────────────────────────────────────────────
export function getSetupGuideMessage(
  step: number,
  botUsername: string,
): string {
  switch (step) {
    case 0:
      return [
        '📋 *话题模式配置向导 - 第 1 步 / 共 4 步*',
        '',
        '话题功能需要群组设置为**公开群组**（有 @username）。',
        '设置方法：',
        '1. 打开群组设置（点击群名称 → 编辑）',
        '2. 点击「群组类型」→ 选择「公开群组」',
        '3. 设置一个唯一的 @username',
        '4. 保存',
        '',
        '✅ 完成后发送 /setup\\_topics 继续',
      ].join('\n');

    case 1:
      return [
        '📋 *话题模式配置向导 - 第 2 步 / 共 4 步*',
        '',
        '请开启群组的「话题」（Forum）模式：',
        '1. 打开群组设置（点击群名称 → 编辑）',
        '2. 找到「话题」开关并启用',
        '3. 保存',
        '',
        '✅ 完成后发送 /setup\\_topics 继续',
      ].join('\n');

    case 2:
      return [
        '📋 *话题模式配置向导 - 第 3 步 / 共 4 步*',
        '',
        `请将 @${botUsername} 设置为管理员：`,
        '1. 打开群组成员列表',
        `2. 找到 @${botUsername} → 设置为管理员`,
        '3. 保存',
        '',
        '✅ 完成后发送 /setup\\_topics 继续',
      ].join('\n');

    case 3:
      return [
        '📋 *话题模式配置向导 - 第 4 步 / 共 4 步*',
        '',
        `请赋予 @${botUsername}「管理话题」权限：`,
        '1. 打开群管理员列表',
        `2. 点击 @${botUsername} 的权限`,
        '3. 开启「管理话题」',
        '4. 保存',
        '',
        '✅ 完成后发送 /setup\\_topics 完成配置',
      ].join('\n');

    case 4:
      return [
        '🎉 *话题模式配置完成！*',
        '',
        '从现在起，每位用户发消息时机器人会在本群自动创建对应话题。',
        '切换不同话题即可与不同用户分别通信。',
        '',
        '如果您在多个群组都配置了话题模式，可在目标群组发送',
        '/use\\_this\\_group 来切换当前激活的话题群组。',
      ].join('\n');

    default:
      return '发送 /setup\\_topics 开始配置话题模式';
  }
}

// ────────────────────────────────────────────────────────────
// 4. 获取或创建某个 BotUser 的专属话题，返回 threadId
// ────────────────────────────────────────────────────────────
export async function getOrCreateTopicForUser(
  api: Api,
  group: IGroup,
  botUser: IBotUser,
): Promise<number | null> {
  const botUserId = botUser.id;

  // 先查已有映射
  const existing = (group.botUserTopics as IBotUserTopic[]).find(
    (t) => t.botUserId === botUserId,
  );
  if (existing) {
    debug(`复用已有话题 threadId=${existing.threadId} for user ${botUserId}`);
    return existing.threadId;
  }

  // 话题名：firstName lastName > userName > 用户ID
  const displayName =
    [botUser.firstName, botUser.lastName].filter(Boolean).join(' ').trim() ||
    botUser.userName ||
    `用户 ${botUserId}`;

  try {
    const topic = await (api as any).createForumTopic(group.id, displayName);
    const threadId: number = topic.message_thread_id;

    await Group.findByIdAndUpdate(group._id, {
      $push: { botUserTopics: { botUserId, threadId, topicName: displayName } },
    });

    (group.botUserTopics as IBotUserTopic[]).push({
      botUserId,
      threadId,
      topicName: displayName,
    });

    debug(`为用户 ${botUserId} 创建新话题 threadId=${threadId}`);
    return threadId;
  } catch (err: any) {
    debug('创建话题失败:', err?.description || err?.message || err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// 5. 根据 threadId 反查 botUserId
// ────────────────────────────────────────────────────────────
export function getBotUserIdByThreadId(
  group: IGroup,
  threadId: number,
): string | null {
  const found = (group.botUserTopics as IBotUserTopic[]).find(
    (t) => t.threadId === threadId,
  );
  return found ? found.botUserId : null;
}
