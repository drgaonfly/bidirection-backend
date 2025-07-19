// import setupDB from '../utils/db';
// import { checkExpiredPayments } from './cron/expiredPayments';
// import { checkExpiredSubscriptions } from './cron/checkExpiredSubscriptions';
// import { trialExpired } from './cron/trialExpired';
// import { checkPendingOrders } from './cron/checkPendingOrders';
// import { updateBotExpiration } from './cron/updateBotExpiration';
// import { notifyBotExpiration } from './cron/notifyBotExpiration';
// import { notifySubscriptionExpiration } from './cron/notifySubscriptionExpiration';
import cron from 'node-cron';
import { checkExpiredPayments } from './cron/expiredRecharges';
import { checkPendingUsdtRecharge } from './cron/checkPendingUsdtRecharge';
import { checkPendingTrxRecharge } from './cron/checkPendingTrxRecharge';
import { checkPendingTrxRental } from './cron/checkPendingTrxRental';
import { checkPendingUsdtRental } from './cron/checkPendingUsdtRental';
import { checkExpiredRentals } from './cron/expiredRental';
// import { checkUsdtWallets } from './cron/checkUsdtWallets // 检查usdt转账记录 旧的';
// // import { checkTrxWallets } from './cron/checkTrxWallets' // 检查trx转账记录 旧的;
// import { checkPendingExchanges } from './cron/checkPendingExchanges';
// import { checkExpiredExchanges } from './cron/expiredExchange';
// import { sendGroupMessages } from './cron/groupMessager';
// import { checkAutoExchanges } from './cron/checkAutoExchanges';
// import { newCheckTrxWallets } from './cron/newCheckTrxWallets';
// import { newCheckUsdtWallets } from './cron/newCheckUsdtWallets';

// 启动定时任务
export const startTaskScheduler = (): void => {
  if (process.env.CRON_ENABLE === 'true') {
    cron.schedule(
      '*/30 * * * * *', // 每三十秒执行一次
      () => {
        checkExpiredPayments();
        checkPendingUsdtRecharge();
        checkPendingTrxRecharge();
        checkExpiredRentals();
        checkPendingTrxRental();
        checkPendingUsdtRental();
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai',
      },
    );
    console.log('订单状态检查定时任务已启动 (每分钟执行)');
  } else {
    console.log('开发环境下，订单状态检查定时任务未启动');
  }
};
