// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/migrates/fix.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/migrates/fix.js

import Income from '../../models/income';
import setupDB from '../../utils/db';

const fix = async () => {
  console.log('开始清理数据...');

  await setupDB();
  console.log('数据库连接成功');

  // 查找所有 isManual 为 false 的收入记录
  const incomes = await Income.find({ isManuall: false });
  console.log(`共找到 ${incomes.length} 个非手动收入记录需要清理`);

  let successCount = 0;
  let failCount = 0;

  // 删除这些记录
  for (const income of incomes) {
    try {
      console.log(`正在删除收入记录 ID: ${income._id}`);
      await Income.deleteOne({ _id: income._id });
      successCount++;
      console.log(`收入记录 ${income._id} 删除成功`);
    } catch (err) {
      failCount++;
      console.error(`收入记录 ${income._id} 删除失败:`, err);
    }
  }

  console.log('清理完成统计:');
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
};

fix()
  .then(() => {
    console.log('数据迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移表数据失败:', error);
    process.exit(1);
  });
