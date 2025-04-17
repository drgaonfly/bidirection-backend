// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/migrates/stacking.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/migrates/stacking.js

import { IUser } from '../../models/user';
import Customer from '../../models/customer';
import Stacking from '../../models/stacking';
import setupDB from '../../utils/db';
import User from '../../models/user';
const migrateColumns = async () => {
  console.log(`[${new Date().toISOString()}] 开始数据迁移...`);

  await setupDB();
  console.log(`[${new Date().toISOString()}] 数据库连接成功`);

  // 查询所有质押记录
  // 查询所有质押记录并填充 employee 字段
  const stackings = await Stacking.find().populate({
    path: 'employee',
    model: User,
  });
  console.log(
    `[${new Date().toISOString()}] 查询到 ${stackings.length} 条质押记录`,
  );

  let processedCount = 0;
  for (const stacking of stackings) {
    // 迁移质押记录
    if (stacking.isFrozen) {
      stacking.status = 'confirmed';
      console.log(
        `[${new Date().toISOString()}] 记录 ${stacking._id} 状态设置为已确认`,
      );
    } else {
      stacking.status = 'pending';
      console.log(
        `[${new Date().toISOString()}] 记录 ${stacking._id} 状态设置为待处理`,
      );
    }

    // 从地址和网络信息查找客户
    const customer = await Customer.findOne({
      address: stacking.fromAddress,
      network: stacking.fromNetwork,
    });

    if (customer) {
      stacking.customer = customer._id;
      console.log(
        `[${new Date().toISOString()}] 记录 ${stacking._id} 关联客户 ${
          customer._id
        }`,
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] 记录 ${stacking._id} 未找到对应客户`,
      );
    }

    const employee = stacking.employee as IUser;

    if (employee) {
      stacking.proxy = employee.proxy;
      console.log(
        `[${new Date().toISOString()}] 记录 ${stacking._id} 设置代理为 ${
          employee.proxy
        }`,
      );
    }

    await stacking.save();
    processedCount++;
    console.log(
      `[${new Date().toISOString()}] 完成处理第 ${processedCount}/${
        stackings.length
      } 条记录`,
    );
  }

  console.log(
    `[${new Date().toISOString()}] 数据迁移完成，共处理 ${processedCount} 条记录`,
  );
};

migrateColumns()
  .then(() => {
    console.log(`[${new Date().toISOString()}] 迁移脚本执行成功`);
    process.exit(0);
  })
  .catch((error) => {
    console.log(`[${new Date().toISOString()}] 迁移质押记录数据失败:`, error);
    process.exit(1);
  });
