/**
 * topicMode 工具函数
 *
 * 统一管理话题模式的准入判断，所有地方都通过这里的函数决策，
 * 避免条件逻辑分散在各中间件/命令里。
 */

import { IGroup } from '../../models/group';

// ─────────────────────────────────────────────────────────────
// 订阅有效性
// ─────────────────────────────────────────────────────────────

/**
 * 检查话题双向通信是否可用，满足任一条件即放行：
 *  1. 正式订阅有效（bot.topicSubscriptionExpiredAt > now）
 *  2. 试用期内（ownerBotUser.topicTrialStartedAt + proxyUser.topic_mode_trial_period 天 > now）
 *
 * 注意：试用开始时间存储在 BotUser（owner）上，不在 Bot 文档上，
 *       调用方必须传入 owner 的 BotUser 文档作为 ownerBotUser。
 *
 * @param bot           bot 文档（需含 topicSubscriptionExpiredAt）
 * @param ownerBotUser  bot 的 owner BotUser 文档（需含 topicTrialStartedAt）
 * @param proxyUser     bot 所属的平台用户（需含 topic_mode_trial_period）
 */
export function isTopicSubscriptionActive(
  bot: any,
  ownerBotUser?: any,
  proxyUser?: any,
): boolean {
  const now = new Date();

  // 条件 1：正式订阅有效
  if (
    bot?.topicSubscriptionExpiredAt &&
    new Date(bot.topicSubscriptionExpiredAt) > now
  ) {
    return true;
  }

  // 条件 2：试用期有效（开始时间记录在 owner BotUser 上，一个 Telegram 用户只能试用一次）
  const trialDays: number = proxyUser?.topic_mode_trial_period ?? 0;
  if (trialDays > 0 && ownerBotUser?.topicTrialStartedAt) {
    const trialEnd = new Date(ownerBotUser.topicTrialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    if (trialEnd > now) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// 话题模式三合一准入判断
// ─────────────────────────────────────────────────────────────

/**
 * 判断话题模式是否完整可用，同时满足以下三个条件才返回 topicGroup：
 *  1. activeTopicGroup 已配置且 setupStep === 3
 *  2. isTopicModeEnabled === true（owner 已手动开启）
 *  3. 订阅有效 或 在试用期内
 *
 * 任一不满足返回 null，调用方只需判断结果是否为 null。
 *
 * @param botDoc        bot 文档（已 populate activeTopicGroup）
 * @param ownerBotUser  bot 的 owner BotUser 文档（需含 topicTrialStartedAt）
 * @param proxyUser     bot 所属的平台用户
 */
export function resolveTopicMode(
  botDoc: any,
  ownerBotUser?: any,
  proxyUser?: any,
): IGroup | null {
  if (!botDoc) {
    console.log('[resolveTopicMode] botDoc is null');
    return null;
  }
  const candidate = botDoc.activeTopicGroup as any;
  if (!candidate) {
    console.log('[resolveTopicMode] activeTopicGroup is null');
    return null;
  }
  if (candidate.setupStep !== 3) {
    console.log('[resolveTopicMode] setupStep is not 3:', candidate.setupStep);
    return null;
  }
  if (!botDoc.isTopicModeEnabled) {
    console.log('[resolveTopicMode] isTopicModeEnabled is false');
    return null;
  }
  if (!isTopicSubscriptionActive(botDoc, ownerBotUser, proxyUser)) {
    console.log('[resolveTopicMode] subscription is not active');
    return null;
  }
  console.log(
    '[resolveTopicMode] all checks passed, returning topicGroup:',
    candidate.id,
  );
  return candidate as IGroup;
}
