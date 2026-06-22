/**
 * tasks/subscription.ts — bidirection-subscription PM2 进程入口
 *
 * 职责：每 5 分钟扫描话题订阅 USDT 入账，匹配后自动续期并通知 owner。
 */

import cron from 'node-cron';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { checkTopicSubscription } from '../services/checkTopicSubscription';
import createDebug from 'debug';

const debug = createDebug('cron:subscription');

async function bootstrap() {
  await setupDB();
  await setupRedis();
  debug('[bidirection-subscription] 连接成功，启动...');

  // 每 5 分钟：扫描话题订阅 USDT 入账，自动续期
  cron.schedule('*/1 * * * *', async () => {
    debug('[cron] checkTopicSubscription 触发');
    try {
      await checkTopicSubscription();
    } catch (err: any) {
      console.error('[cron] checkTopicSubscription 失败:', err?.message || err);
    }
  });

  debug('[bidirection-subscription] 任务已注册，常驻运行中...');
}

bootstrap().catch((err) => {
  console.error('[bidirection-subscription] 启动失败:', err);
  process.exit(1);
});
