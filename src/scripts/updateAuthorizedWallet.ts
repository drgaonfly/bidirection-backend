// cd /www/wwwroot/mev-bot-backend &&
// /www/server/nodejs/v22.14.0/bin/npx /www/server/nodejs/v22.14.0/bin/node dist/scripts/updateAuthorizedWallet.js

// cd /www/wwwroot/mev-bot-backend.2025fc.xyz/mev-bot-backend &&
// /www/server/nodejs/v20.16.0/bin/npx /www/server/nodejs/v20.16.0/bin/node dist/scripts/updateAuthorizedWallet.js

import { IUser } from '../models/user';
import Customer from '../models/customer';
import setupDB from '../utils/db';
import { getWalletService } from '../services/wallet';
import Wallet from '../models/wallet';

const updateAuthorizedWallet = async () => {
  console.log('开始更新授权钱包...');
  await setupDB();

  // 找出所有的 customers
  console.log('正在查询所有客户...');

  // 查询所有包含 employee 和 authorizedWallet 字段的客户
  const customers = await Customer.find().populate('employee authorizedWallet');
  console.log(`共找到 ${customers.length} 个客户`);

  // 循环所有的 customers
  for (const customer of customers) {
    const user = customer.employee as IUser;

    if (!user) {
      console.log(`客户 ${customer._id} 没有关联员工，跳过`);
      continue;
    }

    const authorizedWallet = customer.authorizedWallet;

    if (authorizedWallet) {
      console.log(`客户 ${customer._id} 已有授权钱包，跳过`);
      continue;
    }

    const network = customer.network;
    console.log(`正在为客户 ${customer._id} 查找网络 ${network} 的钱包`);

    const wallet = await getWalletService(user, network, Wallet);

    customer.authorizedWallet = wallet._id;
    await customer.save();
    console.log(`客户 ${customer._id} 授权钱包更新成功`);
  }

  console.log('所有授权钱包更新完成！');
};

updateAuthorizedWallet()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log('更新授权钱包时发生错误:', error);
    process.exit(1);
  });
