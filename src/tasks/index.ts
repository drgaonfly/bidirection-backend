// import setupDB from '../utils/db';
// import { checkExpiredPayments } from './cron/expiredPayments';
// import { checkExpiredSubscriptions } from './cron/checkExpiredSubscriptions';
// import { trialExpired } from './cron/trialExpired';
// import { checkPendingOrders } from './cron/checkPendingOrders';
// import { updateBotExpiration } from './cron/updateBotExpiration';
// import { notifyBotExpiration } from './cron/notifyBotExpiration';
// import { notifySubscriptionExpiration } from './cron/notifySubscriptionExpiration';
import setupDB from '../utils/db';
import { setupRedis } from '../utils/redis';
import { checkExpiredPayments } from './cron/expiredRecharges';
import { checkPendingUsdtRecharge } from './cron/checkPendingUsdtRecharge';
import { checkPendingTrxRecharge } from './cron/checkPendingTrxRecharge';
import { checkPendingTrxRental } from './cron/checkPendingTrxRental';
import { checkPendingUsdtRental } from './cron/checkPendingUsdtRental';
import { checkExpiredRentals } from './cron/expiredRental';
// import { checkTrxWallets } from './cron/checkTrxWallets' // 检查trx转账记录 旧的;
// import { checkPendingExchanges } from './cron/checkPendingExchanges';
// import { checkExpiredExchanges } from './cron/expiredExchange';
// import { sendGroupMessages } from './cron/groupMessager';
// import { checkAutoExchanges } from './cron/checkAutoExchanges';

// 启动定时任务
const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行任务...');

  await checkExpiredPayments();
  await checkPendingUsdtRecharge();
  await checkPendingTrxRecharge();
  await checkPendingTrxRental();
  await checkPendingUsdtRental();
  await checkExpiredRentals();
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
