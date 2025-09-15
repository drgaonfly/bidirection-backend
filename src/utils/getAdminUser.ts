import User from '../models/user';

export async function getAdminUser() {
  const adminId = process.env.ADMIN_WALLET_ID; // 从环境变量获取管理员ID

  // 先查找这个管理员是否存在
  const admin = await User.findOne(
    { _id: adminId },
    '+energy_privateKey +withdraw_privateKey +mnemonic',
  );

  if (!admin) {
    throw new Error('未找到这个超级管理员');
  }

  return admin;
}
