import { exec } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcrypt';
import MemberOrder from '../models/memberOrder';
import User from '../models/user';

const execAsync = promisify(exec);

/**
 * 根据已支付订单为用户购买 Telegram Premium
 * @param orderId 订单的 MongoDB ID
 * @returns Promise，返回操作结果
 */
export async function buyTelegramPremium(orderId: string): Promise<boolean> {
  try {
    // 查找订单并填充 botUser 字段
    const order = await MemberOrder.findById(orderId).populate('botUser');

    if (!order) {
      console.error(`[buyTelegramPremium] 未找到订单 ${orderId}`);
      return false;
    }

    if (order.status !== 'paid') {
      console.error(
        `[buyTelegramPremium] 订单 ${orderId} 未支付，当前状态: ${order.status}`,
      );
      return false;
    }

    if (order.hasPurchased) {
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
    const admin = await User.findOne({ isAdmin: true }).select('+mnemonic');
    if (!admin || !admin.mnemonic) {
      console.error('[buyTelegramPremium] 无法获取管理员助记词');
      return false;
    }

    // 助记词已使用bcrypt加密，需要通过明文助记词和bcrypt.compare进行验证
    // 这里需要从安全的地方获取明文助记词，用于与加密助记词进行比较
    // 例如：可能需要从环境变量、安全存储或用户输入获取
    const encryptedMnemonic = admin.mnemonic;
    const plainMnemonic = process.env.ADMIN_MNEMONIC_PLAIN || '';

    // 验证明文助记词
    // 实际应用中，此处逻辑应替换为获取正确明文助记词的方式
    if (!(await bcrypt.compare(plainMnemonic, encryptedMnemonic))) {
      console.error('[buyTelegramPremium] 管理员助记词验证失败');
      return false;
    }

    const username = `@${botUser.userName}`;
    console.log(`[buyTelegramPremium] 正在为用户购买 premium: ${username}`);

    // 设置 Go 脚本所需的环境变量
    const env = {
      ...process.env,
      OpenUserName: username, // 需要购买 Premium 的 Telegram 用户名（带@）
      OpenDuration: String(order.months || 1), // 如果未指定则默认为 1 个月
      WalletMnemonic: plainMnemonic, // 使用明文助记词
      ResHash: process.env.FRAGMENT_HASH || 'c6379108b103d135c8', // fragment 资源 hash，从环境变量获取
      ResCookie:
        process.env.FRAGMENT_COOKIE ||
        'c300b6f8d9748ef9ab80f804619e774ec300b6e2c300bbede6c71a5db76c515d2d388', // fragment 资源 cookie，从环境变量获取
    };

    // 执行 Go 脚本购买 Telegram Premium
    console.log(
      `[buyTelegramPremium] 执行订单 ${order.orderNumber} 的 premium 购买`,
    );
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
    order.hasPurchased = true;
    await order.save();

    console.log(
      `[buyTelegramPremium] 成功为 ${username} 购买 premium，订单号: ${order.orderNumber}`,
    );
    return true;
  } catch (error) {
    console.error('[buyTelegramPremium] 购买 Telegram Premium 时出错:', error);
    return false;
  }
}
