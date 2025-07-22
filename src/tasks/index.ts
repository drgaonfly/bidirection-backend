import setupDB from '../utils/db';

// import { trialExpired } from './cron/trialExpired';
// import { checkPendingOrders } from './cron/checkPendingOrders';

import { checkPendingExchanges } from './cron/checkPendingExchanges';
import { checkExpiredExchanges } from './cron/expiredExchange';
import { sendGroupMessages } from './cron/groupMessager';
import { checkAutoExchanges } from './cron/checkAutoExchanges';
import { newCheckTrxWallets } from './cron/newCheckTrxWallets';
import { newCheckUsdtWallets } from './cron/newCheckUsdtWallets';
import { checkPendingUsdtRecharge } from './cron/checkPendingUsdtRecharge';
import { checkPendingTrxRecharge } from './cron/checkPendingTrxRecharge';
import { checkExpiredPayments } from './cron/expiredRecharges';

import { checkPendingTrxRental } from './cron/checkPendingTrxRental';
import { checkPendingUsdtRental } from './cron/checkPendingUsdtRental';
import { checkExpiredRentals } from './cron/expiredRental';
import { checkMemberOrders } from './cron/checkMemberOrders';

import { checkExpiredAnynoumy } from './cron/expiredAnynoumy';

import { setupRedis } from '../utils/redis';

const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行任务...');
  await checkExpiredExchanges(); // 检查过期的兑换记录
  await checkPendingExchanges(); // 为他人兑换
  await checkAutoExchanges(); // 检查授权兑换
  await sendGroupMessages(); // 发送群发消息
  await newCheckTrxWallets();
  await newCheckUsdtWallets();
  await checkExpiredPayments();
  await checkPendingUsdtRecharge();
  await checkPendingTrxRecharge();
  await checkMemberOrders(); // 检查购买会员订单

  await checkExpiredRentals();
  await checkPendingTrxRental();
  await checkPendingUsdtRental();

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
