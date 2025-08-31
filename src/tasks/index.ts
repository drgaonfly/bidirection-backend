import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';

import { checkPendingExchanges } from './cron/checkPendingExchanges';
import { checkExpiredExchanges } from './cron/expiredExchange';
import { sendGroupMessages } from './cron/groupMessager';
import { checkAutoExchanges } from './cron/checkAutoExchanges';
import { newCheckTrxWallets } from './cron/newCheckTrxWallets';
import { newCheckUsdtWallets } from './cron/newCheckUsdtWallets';
import { checkPendingUsdtRecharge } from './cron/checkPendingUsdtRecharge';
import { checkPendingTrxRecharge } from './cron/checkPendingTrxRecharge';
import { checkExpiredPayments } from './cron/expiredRecharges';

// import { checkPendingTrxRental } from './cron/checkPendingTrxRental';
import { checkPendingUsdtRental } from './cron/checkPendingUsdtRental';
import { checkExpiredRentals } from './cron/expiredRental';
import { checkMemberOrders } from './cron/checkMemberOrders';

import { checkExpiredAnynoumy } from './cron/expiredAnynoumy';

import { checkTgStarsOrders } from './cron/checkTgStarsOrders';

import { checkAutoRentals } from './cron/checkAutoRentals';
import { checkAutoUnRentals } from './cron/checkAutoUnRentals';
// import { checkAutoUnPackageUsages } from './cron/checkAutoUnPackageUsages';

import { checkEnergyFlow } from './cron/checkEnergyFlow';
import { recycleEnergy } from './cron/recycleEnergy';
import { checkExpiredPackageOrders } from './cron/checkExpiredPackageOrders';
// import { recycleEnergyWhenOtherUseEnergy } from './cron/recycleEnergyWhenOtherUseEnergy';
// import { recycleEnergyWhenOtherNotUseEnergy } from './cron/recycleEnergyWhenOtherNotUseEnergy';

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
  await checkTgStarsOrders(); //电报星星订单

  await checkExpiredRentals();
  await checkExpiredPackageOrders();
  // await checkPendingTrxRental();
  await checkPendingUsdtRental(); // 处理日租

  await checkExpiredAnynoumy();
  await checkAutoRentals(); // 处理闪租
  await checkAutoUnRentals(); // 解除闪租
  // await checkAutoUnPackageUsages(); // 解除日租
  await checkEnergyFlow(); // 给自己用, 监听并生成能量使用记录

  await recycleEnergy(); // 给他人用, 今天只要消费超过五笔（这个五不是写死的）。就立马回收能量
  // await recycleEnergyWhenOtherUseEnergy(); // 给他人用，如果他人用了，就创建能量使用记录后立马回收
  // await recycleEnergyWhenOtherNotUseEnergy(); // 给他人用，如果他人在一小时内没有用，就回收
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
