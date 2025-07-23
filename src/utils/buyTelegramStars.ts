import { exec } from 'child_process';
import { promisify } from 'util';
import TgStarsOrder from '../models/tgStarsOrder';
import { decrypt } from '../services/encrypt';
import { getAdminUser } from './buyTelegramPremium';

const execAsync = promisify(exec);

/**
 * 根据已支付订单为用户购买 Telegram Stars
 * @param orderId 订单的 MongoDB ID
 * @returns Promise，返回操作结果
 */
export async function buyTelegramStars(orderId: string): Promise<boolean> {
  try {
    // 查找订单并填充 botUser 字段
    const order = await TgStarsOrder.findById(orderId).populate('botUser');

    if (!order) {
      console.error(`[buyTelegramStars] 未找到订单 ${orderId}`);
      return false;
    }

    if (order.status !== 'paid') {
      console.error(
        `[buyTelegramStars] 订单 ${orderId} 未支付，当前状态: ${order.status}`,
      );
      return false;
    }

    if (order.hasPurchased) {
      console.log(`[buyTelegramStars] 订单 ${orderId} 已经购买过 Stars`);
      return true;
    }

    // 获取用户名并加上 @ 前缀
    const botUser = order.botUser as any; // 用 any 访问 userName 属性
    if (!botUser || !botUser.userName) {
      console.error(
        `[buyTelegramStars] 订单 ${orderId} 的 botUser 无效或缺少 userName`,
      );
      return false;
    }

    // 获取超级管理员的加密助记词
    const admin = await getAdminUser();
    if (!admin || !admin.mnemonic) {
      console.error('[buyTelegramStars] 无法获取管理员助记词');
      return false;
    }

    // 使用decrypt函数解密管理员助记词
    const encryptedMnemonic = admin.mnemonic;
    const plainMnemonic = decrypt(encryptedMnemonic);

    if (!plainMnemonic) {
      console.error('[buyTelegramStars] 管理员助记词解密失败');
      return false;
    }

    const username = `@${botUser.userName}`;
    console.log(
      `[buyTelegramStars] 正在为用户购买 Stars: ${username}, 数量: ${order.starsAmount}`,
    );

    // 设置 Go 脚本所需的环境变量
    const env = {
      OpenUserName: username, // 需要购买 Stars 的 Telegram 用户名（带@）
      StarsAmount: String(order.starsAmount), // Stars 数量
      WalletMnemonic: plainMnemonic, // 使用解密后的助记词
    };

    // 执行 Go 脚本购买 Telegram Stars
    console.log(
      `[buyTelegramStars] 执行订单 ${order.orderNumber} 的 Stars 购买`,
    );
    const { stdout, stderr } = await execAsync(
      'go run path/to/stars_purchase_script.go',
      { env },
    );

    if (stderr) {
      console.error(`[buyTelegramStars] 购买 Stars 出错: ${stderr}`);
      return false;
    }

    console.log(`[buyTelegramStars] 购买结果: ${stdout}`);

    // 如果执行到这里，说明购买成功
    // 更新订单，标记为已购买
    order.hasPurchased = true;
    await order.save();

    console.log(
      `[buyTelegramStars] 成功为 ${username} 购买 ${order.starsAmount} Stars，订单号: ${order.orderNumber}`,
    );
    return true;
  } catch (error) {
    console.error('[buyTelegramStars] 购买 Telegram Stars 时出错:', error);
    return false;
  }
}
