import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';

// import { trialExpired } from './cron/trialExpired';
// import { checkPendingOrders } from './cron/checkPendingOrders';

import { checkMinConsumption } from './cron/checkMinConsumption';
import { removeIntoTrash } from './cron/removeIntoTrash';
// import { recycleEnergyDaily } from './cron/recycleEnergyDaily';

// 每天 0 点 五分跑
const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行扣低消任务...');

  await checkMinConsumption(); // 每日低消扣可用笔数，没用能量才触发
  // await recycleEnergyDaily(); // 给自己用，超过低消就立马回收能量
  await removeIntoTrash(); // 每日清理过期套餐订单的使用数据
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
