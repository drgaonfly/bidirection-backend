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
 * 检查 bot 的话题双向通信订阅是否有效
 */
export function isTopicSubscriptionActive(bot: any): boolean {
  if (!bot?.topicSubscriptionExpiredAt) return false;
  return new Date(bot.topicSubscriptionExpiredAt) > new Date();
}

// ─────────────────────────────────────────────────────────────
// 话题模式三合一准入判断
// ─────────────────────────────────────────────────────────────

/**
 * 判断话题模式是否完整可用，同时满足以下三个条件才返回 topicGroup：
 *  1. activeTopicGroup 已配置且 setupStep === 4
 *  2. isTopicModeEnabled === true（owner 已手动开启）
 *  3. 订阅有效（topicSubscriptionExpiredAt > now）
 *
 * 任一不满足返回 null，调用方只需判断结果是否为 null。
 */
export function resolveTopicMode(botDoc: any): IGroup | null {
  if (!botDoc) return null;
  const candidate = botDoc.activeTopicGroup as any;
  if (!candidate) return null;
  if (candidate.setupStep !== 4) return null;
  if (!botDoc.isTopicModeEnabled) return null;
  if (!isTopicSubscriptionActive(botDoc)) return null;
  return candidate as IGroup;
}
