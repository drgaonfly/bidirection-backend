import cron from 'node-cron';
import { updatePoolValues } from './cron/updatePoolValues';
import { checkActivityStatus } from './cron/checkActivityStatus';

// 启动定时任务
export const scheduledtasks = (): void => {
  if (process.env.CRON_ENABLE === 'true') {
    // 每2秒执行一次更新
    setInterval(updatePoolValues, 30000);

    // 每分钟检查一次活动状态
    cron.schedule(
      '* * * * *',
      async () => {
        await checkActivityStatus();
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai',
      },
    );

    console.log('定时任务已启动：');
    console.log('- 池子数值更新：每3秒执行一次');
    console.log('- 活动状态检查：每分钟执行一次');
  } else {
    console.log('开发环境下，定时任务未启动');
  }
};
