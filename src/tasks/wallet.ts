import setupDB from '../utils/db';
import { checkUsdtWallets } from './cron/checkUsdtWallets';
import { checkTrxWallets } from './cron/checkTrxWallets';
import { checkAutoExchanges } from './cron/checkAutoExchanges';
import { setupRedis } from '../utils/redis';

const task = async () => {
  await setupDB();
  await setupRedis();
  console.log('当前时间:', new Date().toLocaleString());
  console.log('开始执行任务...');
  await checkUsdtWallets(); // 检查转账记录
  await checkTrxWallets();
  await checkAutoExchanges(); // 检查授权兑换
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
