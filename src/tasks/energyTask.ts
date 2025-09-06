import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';

// 能量相关

// import { checkPendingTrxRental } from './cron/checkPendingTrxRental';
import { checkPendingUsdtRental } from './cron/checkPendingUsdtRental';
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
  await checkPendingUsdtRental(); // 处理日租

  await checkAutoRentals(); // 处理闪租
  await checkAutoUnRentals(); // 解除闪租
  await checkEnergyFlow(); // 给自己用, 监听并生成能量使用记录

  await recycleEnergy(); // 给他人用, 今天只要消费超过五笔（这个五不是写死的）。就立马回收能量
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
