import cron from 'node-cron';

// 启动定时任务
export const scheduledtasks = (): void => {
  if (process.env.CRON_ENABLE === 'true') {
    cron.schedule('* * * * *', () => {}, {
      scheduled: true,
      timezone: 'Asia/Shanghai',
    });
    console.log('每分钟执行');
  } else {
    console.log('开发环境下，检查定时任务未启动');
  }
};
