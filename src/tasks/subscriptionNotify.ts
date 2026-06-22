/**
 * tasks/subscriptionNotify.ts — bidirection-subscription-notify PM2 进程入口
 *
 * 职责：
 *   - 每天 10:00  提前 3 天通知话题订阅即将到期的 bot owner
 *   - 每天 10:00  将已到期的 Subscription 记录状态更新为 expired
 */

import cron from 'node-cron';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { notifyTopicSubscriptionExpiration } from './cron/notifyTopicSubscriptionExpiration';
import createDebug from 'debug';

const debug = createDebug('cron:subscriptionNotify');

async function bootstrap() {
  await setupDB();
  await setupRedis();
  debug('[bidirection-subscription-notify] 连接成功，启动...');

  // 每天 10:00：到期提醒 + 标记已过期 Subscription 记录
  cron.schedule('0 10 * * *', async () => {
    debug('[cron] notifyTopicSubscriptionExpiration 触发');
    try {
      await notifyTopicSubscriptionExpiration();
    } catch (err: any) {
      console.error(
        '[cron] notifyTopicSubscriptionExpiration 失败:',
        err?.message || err,
      );
    }
  });

  debug('[bidirection-subscription-notify] 任务已注册，常驻运行中...');
}

bootstrap().catch((err) => {
  console.error('[bidirection-subscription-notify] 启动失败:', err);
  process.exit(1);
});
