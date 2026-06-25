// src/bot/services/topicService.ts
/**
 * 话题模式服务
 *
 * 配置步骤：
 *  0 = 话题模式未开启
 *  1 = 话题模式已开，机器人不是管理员
 *  2 = 机器人是管理员但缺 can_manage_topics 权限
 *  3 = 全部完成
 *
 * 多群组支持：
 *  bot.activeTopicGroup 指向当前激活的话题群组。
 *  配置完成时若未设置则自动写入；owner 可在任意已完成群组发
 *  /use_this_group 来切换。
 */

import { Api } from 'grammy';
import Group, { IGroup, IBotUserTopic } from '../../models/group';
import Bot from '../../models/bot';
import BotUser, { IBotUser } from '../../models/botUser';
import User from '../../models/user';
import { isTopicSubscriptionActive } from '../middlewares/checkTopicSubscription';
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
export interface RefreshTopicSetupStateResult {
  step: number;
  needsTrialPrompt?: boolean; // 是否需要提示用户开启试用（可试用但未试用）
}

export async function refreshTopicSetupState(
  api: Api,
  group: IGroup,
  botId: number,
  /** 传入 bot._id，完成时若无 activeTopicGroup 则自动写入 */
  botMongoId?: any,
): Promise<RefreshTopicSetupStateResult> {
  const chatId = group.id;

  let chat: any;
  try {
    chat = await api.getChat(chatId);
  } catch (err) {
    debug('getChat 失败:', err);
    return { step: group.setupStep };
  }

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
  if (forumEnabled) step = 1;
  if (forumEnabled && isAdmin && !canManageTopics) step = 2;
  if (forumEnabled && isAdmin && canManageTopics) step = 3;

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
  if (step === 3 && botMongoId) {
    // 检查订阅状态，只在订阅有效时自动开启话题模式
    const bot = await Bot.findById(botMongoId)
      .select('user owner topicSubscriptionExpiredAt topicTrialStartedAt')
      .lean();

    const proxyUser = await User.findById(bot?.user).lean();
    const ownerBotUser = await BotUser.findById(bot?.owner).lean();
    const isSubscriptionActive = isTopicSubscriptionActive(
      bot,
      ownerBotUser,
      proxyUser,
    );

    const updateData: any = { activeTopicGroup: group._id };

    if (isSubscriptionActive) {
      // 订阅有效（月付或试用期内），自动开启
      updateData.isTopicModeEnabled = true;
      debug(`bot ${botMongoId} isTopicModeEnabled 自动开启（订阅有效）`);
    } else {
      // 订阅无效，不自动开启
      debug(`bot ${botMongoId} isTopicModeEnabled 未开启（订阅无效）`);
    }

    await Bot.findOneAndUpdate(
      { _id: botMongoId, activeTopicGroup: null },
      updateData,
    );
    debug(`bot ${botMongoId} activeTopicGroup 自动设为群组 ${group.id}`);
  }

  debug(
    `群组 ${chatId}: step=${step}, supergroup=${isSupergroup}, forum=${forumEnabled}, admin=${isAdmin}, manageTopics=${canManageTopics}`,
  );

  const result: RefreshTopicSetupStateResult = { step };

  // 检查是否需要提示用户开启试用
  if (step === 3 && botMongoId) {
    const bot = await Bot.findById(botMongoId)
      .select('user owner topicSubscriptionExpiredAt topicTrialStartedAt')
      .lean();

    const proxyUser = await User.findById(bot?.user).lean();
    const ownerBotUser = await BotUser.findById(bot?.owner).lean();
    const isSubscriptionActive = isTopicSubscriptionActive(
      bot,
      ownerBotUser,
      proxyUser,
    );

    // 如果订阅无效，但可试用且未试用，提示用户开启试用
    if (
      !isSubscriptionActive &&
      proxyUser?.topic_mode_trial_period > 0 &&
      !ownerBotUser?.topicTrialStartedAt
    ) {
      result.needsTrialPrompt = true;
    }
    // 如果已试用且在试用期内，isSubscriptionActive 会返回 true，会自动开启 isTopicModeEnabled
  }

  return result;
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
