import { exec } from 'child_process';
import { promisify } from 'util';
import Premium from '../models/premium';
import User from '../models/user';
import { decrypt } from '../services/encrypt';

const execAsync = promisify(exec);

export async function getAdminUser() {
  const adminId = process.env.ADMIN_WALLET_ID; // 从环境变量获取管理员ID

  // 先查找这个管理员是否存在
  const admin = await User.findOne(
    { _id: adminId },
    '+energy_privateKey +withdraw_privateKey',
  );

  if (!admin) {
    throw new Error('未找到这个超级管理员');
  }

  return admin;
}

/**
 * 根据已支付订单为用户购买 Telegram Premium
 * @param orderId 订单的 MongoDB ID
 * @returns Promise，返回操作结果
 */
export async function buyTelegramPremium(orderId: string): Promise<boolean> {
  try {
    // 查找订单并填充 botUser 字段
    const order = await Premium.findById(orderId).populate('botUser');

    if (!order) {
      console.error(`[buyTelegramPremium] 未找到订单 ${orderId}`);
      return false;
    }

    if (order.status !== 'success') {
      console.error(
        `[buyTelegramPremium] 订单 ${orderId} 未支付，当前状态: ${order.status}`,
      );
      return false;
    }

    if (order.tx_id) {
      console.log(`[buyTelegramPremium] 订单 ${orderId} 已经购买过 premium`);
      return true;
    }

    // 获取用户名并加上 @ 前缀
    const botUser = order.botUser as any; // 用 any 访问 userName 属性
    if (!botUser || !botUser.userName) {
      console.error(
        `[buyTelegramPremium] 订单 ${orderId} 的 botUser 无效或缺少 userName`,
      );
      return false;
    }

    // 获取超级管理员的加密助记词
    const admin = await getAdminUser();
    if (!admin || !admin.mnemonic) {
      console.error('[buyTelegramPremium] 无法获取管理员助记词');
      return false;
    }

    // 使用decrypt函数解密管理员助记词
    const encryptedMnemonic = admin.mnemonic;
    const plainMnemonic = decrypt(encryptedMnemonic);

    if (!plainMnemonic) {
      console.error('[buyTelegramPremium] 管理员助记词解密失败');
      return false;
    }

    const username = `@${botUser.userName}`;
    console.log(`[buyTelegramPremium] 正在为用户购买 premium: ${username}`);

    // 设置 Go 脚本所需的环境变量
    const env = {
      OpenUserName: username, // 需要购买 Premium 的 Telegram 用户名（带@）
      OpenDuration: String(order.months || 1), // 如果未指定则默认为 1 个月
      WalletMnemonic: plainMnemonic, // 使用解密后的助记词
      ResHash: process.env.FRAGMENT_HASH || 'c6379108b103d135c8', // fragment 资源 hash，从环境变量获取
      ResCookie:
        process.env.FRAGMENT_COOKIE ||
        'c300b6f8d9748ef9ab80f804619e774ec300b6e2c300bbede6c71a5db76c515d2d388', // fragment 资源 cookie，从环境变量获取
    };

    console.log('env: Go 脚本所需的参数', env);

    // 执行 Go 脚本购买 Telegram Premium
    console.log(`[buyTelegramPremium] 执行订单 ${order.id} 的 premium 购买`);
    const { stdout, stderr } = await execAsync(
      'go run path/to/premium_purchase_script.go',
      { env },
    );

    if (stderr) {
      console.error(`[buyTelegramPremium] 购买 premium 出错: ${stderr}`);
      return false;
    }

    console.log(`[buyTelegramPremium] 购买结果: ${stdout}`);

    // 如果执行到这里，说明购买成功
    // 更新订单，标记为已购买
    order.status = 'success';
    await order.save();

    console.log(
      `[buyTelegramPremium] 成功为 ${username} 购买 premium，订单号: ${order.id}`,
    );
    return true;
  } catch (error) {
    console.error('[buyTelegramPremium] 购买 Telegram Premium 时出错:', error);
    return false;
  }
}
