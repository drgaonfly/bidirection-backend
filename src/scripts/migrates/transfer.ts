// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/migrates/transfer.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/migrates/transfer.js

import { IUser } from '../../models/user';
import Transfer from '../../models/transfer';
import setupDB from '../../utils/db';
import User from '../../models/user';
import Customer from '../../models/customer';

const migrateColumns = async () => {
  console.log('开始数据迁移...');

  await setupDB();
  console.log('数据库连接成功');

  // 需要先导入 User 模型以避免 MissingSchemaError
  const transfers = await Transfer.find().populate({
    path: 'employee',
    model: User,
  });
  console.log(`共找到 ${transfers.length} 个转账记录需要迁移`);

  let successCount = 0;
  let failCount = 0;

  for (const transfer of transfers) {
    try {
      console.log(`正在处理转账记录 ID: ${transfer._id}`);

      const customer = await Customer.findOne({
        address: transfer.sender,
        network: transfer.network,
      });

      if (customer) {
        transfer.customer = customer._id;
        console.log(
          `[${new Date().toISOString()}] 记录 ${transfer._id} 设置客户为 ${
            customer._id
          }`,
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] 记录 ${
            transfer._id
          } 未找到匹配的客户记录: ${transfer.sender}`,
        );
      }

      // 更新代理信息
      const employee = transfer.employee as IUser;
      console.log(`更新代理信息: ${employee?.proxy} -> ${transfer.proxy}`);
      transfer.proxy = employee?.proxy;

      await transfer.save();
      successCount++;
      console.log(`转账记录 ${transfer._id} 处理成功`);
    } catch (err) {
      failCount++;
      console.error(`转账记录 ${transfer._id} 处理失败:`, err);
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
