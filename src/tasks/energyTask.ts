import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { checkExpiredRentals } from './cron/expiredRental';
import { checkAutoRentals } from './cron/checkAutoRentals';
import { checkAutoUnRentals } from './cron/checkAutoUnRentals';
import { checkEnergyFlow } from './cron/checkEnergyFlow';
import { recycleEnergy } from './cron/recycleEnergy';
import { checkExpiredPackageOrders } from './cron/checkExpiredPackageOrders';

const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行任务...');

  await checkExpiredRentals();
  await checkExpiredPackageOrders();

  await checkAutoRentals(); // 处理闪租
  await checkAutoUnRentals(); // 解除闪租,1小时内后回收 , 1 小时内的，监听并生成能量使用记录，视其情况回收能量

  await checkEnergyFlow(); // 处理套餐使用记录, 给自己用, 监听并生成能量使用记录，视能量使用记录情况回收能量
  await recycleEnergy(); // 处理套餐使用记录, 给他人用, 超过平台配置的快速回收时间, 就立马回收能量
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
