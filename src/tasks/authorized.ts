import cron from 'node-cron';
import { generateFlowingIncome } from '../controllers/incomeController';

// 启动定时任务
export const authorized = (): void => {
  if (process.env.CRON_AUTHORIZED === 'true') {
    // 每8小时为授权用户创建收益记录
    cron.schedule(
      '* * * * *',
      async () => {
        try {
          await generateFlowingIncome();
        } catch (error) {
          console.error('执行定时收益生成任务时发生错误:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai',
      },
    );

    console.log('定时任务已启动：');
    console.log('- 授权用户收益生成：每8小时执行一次');
  } else {
    console.log('开发环境下，定时任务未启动');
  }
};
