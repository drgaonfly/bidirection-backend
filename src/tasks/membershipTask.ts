import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { checkPremiums } from './cron/checkPremiums';
import { checkExpiredAnynoumy } from './cron/expiredAnynoumy';
import { checkStars } from './cron/checkStars';

const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行电报会员任务...');

  await checkPremiums(); // 检查购买会员订单
  await checkStars(); //电报星星订单
  await checkExpiredAnynoumy();
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

// export function startTaskScheduler() {
//   cron.schedule('* * * * *', async () => {
//     console.log(`[定时任务] ${new Date().toLocaleString()} 开始执行`);
//     try {
//       await task();
//       console.log('[定时任务] 执行完成 ✅');
//     } catch (error) {
//       console.error('[定时任务] 执行出错 ❌', error);
//     }
//   });
// }
