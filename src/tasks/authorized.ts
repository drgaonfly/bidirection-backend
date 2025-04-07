import cron from 'node-cron';
import { generateFlowingIncome } from '../controllers/incomeController';
import Setting from '../models/setting';

// 启动定时任务
export const authorized = async (): Promise<void> => {
  if (process.env.CRON_AUTHORIZED === 'true') {
    try {
      // 从设置中获取执行间隔时间（用于显示倒计时和计算用户收益）
      const authorizationSetting = await Setting.findOne({
        key: 'authorization',
      });
      if (!authorizationSetting) {
        console.error('未找到授权收益间隔时间设置');
        return;
      }

      const intervalHours = parseInt(authorizationSetting.value);
      if (isNaN(intervalHours) || intervalHours <= 0) {
        console.error('授权收益间隔时间设置无效');
        return;
      }

      // 修改定时任务为每小时运行一次，这样可以更精确地检查用户参与时间
      const cronExpression = `0 * * * *`;

      // 创建定时任务
      cron.schedule(
        cronExpression,
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
      console.log(`- 授权用户收益生成：每小时检查一次`);
      console.log(`- 每个用户按照参与时间 + ${intervalHours}小时间隔生成收益`);
    } catch (error) {
      console.error('启动定时任务时发生错误:', error);
    }
  } else {
    console.log('开发环境下，定时任务未启动');
  }
};
