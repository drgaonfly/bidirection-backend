// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/migrates/customer.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/migrates/customer.js

import { IUser } from '../../models/user';
import Customer from '../../models/customer';
import setupDB from '../../utils/db';

const migrateColumns = async () => {
  console.log('开始数据迁移...');

  await setupDB();
  console.log('数据库连接成功');

  const customers = await Customer.find().populate('employee');
  console.log(`共找到 ${customers.length} 个客户需要迁移`);

  let successCount = 0;
  let failCount = 0;

  for (const customer of customers) {
    try {
      console.log(`正在处理客户 ID: ${customer._id}`);

      customer.isDemoAccount = customer.isAuthorized;
      customer.demoAt = customer.authorizedAt;

      const employee = customer.employee as IUser;
      customer.proxy = employee?.proxy;

      await customer.save();
      successCount++;
      console.log(`客户 ${customer._id} 处理成功`);
    } catch (err) {
      failCount++;
      console.error(`客户 ${customer._id} 处理失败:`, err);
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
