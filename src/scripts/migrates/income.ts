// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/migrates/income.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/migrates/income.js

import { IUser } from '../../models/user';
import Income from '../../models/income';
import setupDB from '../../utils/db';
import User from '../../models/user';

const migrateColumns = async () => {
  console.log('开始数据迁移...');

  await setupDB();
  console.log('数据库连接成功');

  // 需要先导入 User 模型以避免 MissingSchemaError
  const incomes = await Income.find().populate({
    path: 'employee',
    model: User,
  });
  console.log(`共找到 ${incomes.length} 个收入记录需要迁移`);

  let successCount = 0;
  let failCount = 0;

  for (const income of incomes) {
    try {
      console.log(`正在处理收入记录 ID: ${income._id}`);

      // 更新代理信息
      const employee = income.employee as IUser;
      console.log(`更新代理信息: ${employee?.proxy} -> ${income.proxy}`);
      income.proxy = employee?.proxy;

      await income.save();
      successCount++;
      console.log(`收入记录 ${income._id} 处理成功`);
    } catch (err) {
      failCount++;
      console.error(`收入记录 ${income._id} 处理失败:`, err);
    }
  }

  console.log('迁移完成统计:');
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
};

migrateColumns()
  .then(() => {
    console.log('数据迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移表数据失败:', error);
    process.exit(1);
  });
