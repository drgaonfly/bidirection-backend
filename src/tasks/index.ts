/**
 * tasks/index.ts — bidirection-task PM2 进程入口
 *
 * 负责原有通用定时任务：
 *   - 每小时整点   updateBotExpiration    检查并标记过期 bot
 *   - 每天 09:00   notifyBotExpiration    提前 3 天通知 bot 即将过期
 *   - 每小时 :30   sendGroupMessages      群发消息
 */

import cron from 'node-cron';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { updateBotExpiration } from './cron/updateBotExpiration';
import { notifyBotExpiration } from './cron/notifyBotExpiration';
import { sendGroupMessages } from './cron/groupMessager';
import createDebug from 'debug';

const debug = createDebug('cron:task');

async function bootstrap() {
  await setupDB();
  await setupRedis();
  debug('[bidirection-task] 连接成功，启动定时任务...');

  // ── 每小时整点：检查 bot 是否到期并标记 ──────────────────────
  cron.schedule('0 * * * *', async () => {
    debug('[cron] updateBotExpiration 触发');
    try {
      await updateBotExpiration();
    } catch (err: any) {
      console.error('[cron] updateBotExpiration 失败:', err?.message || err);
    }
  });

  // ── 每天 09:00：提前通知 bot 即将到期 ────────────────────────
  cron.schedule('0 9 * * *', async () => {
    debug('[cron] notifyBotExpiration 触发');
    try {
      await notifyBotExpiration();
    } catch (err: any) {
      console.error('[cron] notifyBotExpiration 失败:', err?.message || err);
    }
  });

  // ── 每小时 :30：群发消息 ──────────────────────────────────────
  cron.schedule('30 * * * *', async () => {
    debug('[cron] sendGroupMessages 触发');
    try {
      await sendGroupMessages();
    } catch (err: any) {
      console.error('[cron] sendGroupMessages 失败:', err?.message || err);
    }
  });

  debug('[bidirection-task] 所有任务已注册，常驻运行中...');
}

bootstrap().catch((err) => {
  console.error('[bidirection-task] 启动失败:', err);
  process.exit(1);
});
