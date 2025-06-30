import setupDB from '../utils/db';
import { checkPendingExchanges } from './cron/checkPendingExchanges';
import { checkExpiredExchanges } from './cron/expiredExchange';
import { sendGroupMessages } from './cron/groupMessager';
import { setupRedis } from '../utils/redis';

const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行任务...');
  await checkExpiredExchanges(); // 检查过期的兑换记录
  await checkPendingExchanges(); // 为他人兑换
  await sendGroupMessages(); // 发送群发消息
};

// 执行任务并在完成后退出进程
task()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Task failed:', err);
    process.exit(1);
  });
