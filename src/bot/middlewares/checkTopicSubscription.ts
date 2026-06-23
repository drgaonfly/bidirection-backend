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
 *  1. 订阅有效（bot.topicSubscriptionExpiredAt > now）
 *  2. 在试用期内（bot.createdAt + proxyUser.topic_mode_trial_period 天 > now）
 *
 * @param bot        bot 文档（需含 topicSubscriptionExpiredAt、createdAt）
 * @param proxyUser  bot 所属的平台用户（需含 topic_mode_trial_period）
 */
export function isTopicSubscriptionActive(bot: any, proxyUser?: any): boolean {
  const now = new Date();

  // 条件 1：正式订阅有效
  if (
    bot?.topicSubscriptionExpiredAt &&
    new Date(bot.topicSubscriptionExpiredAt) > now
  ) {
    return true;
  }

  // 条件 2：试用期有效
  const trialDays: number = proxyUser?.topic_mode_trial_period ?? 0;
  if (trialDays > 0 && bot?.createdAt) {
    const trialEnd = new Date(bot.createdAt);
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
 *  1. activeTopicGroup 已配置且 setupStep === 4
 *  2. isTopicModeEnabled === true（owner 已手动开启）
 *  3. 订阅有效 或 在试用期内
 *
 * 任一不满足返回 null，调用方只需判断结果是否为 null。
 *
 * @param botDoc    bot 文档（已 populate activeTopicGroup）
 * @param proxyUser bot 所属的平台用户
 */
export function resolveTopicMode(botDoc: any, proxyUser?: any): IGroup | null {
  if (!botDoc) return null;
  const candidate = botDoc.activeTopicGroup as any;
  if (!candidate) return null;
  if (candidate.setupStep !== 4) return null;
  if (!botDoc.isTopicModeEnabled) return null;
  if (!isTopicSubscriptionActive(botDoc, proxyUser)) return null;
  return candidate as IGroup;
}
