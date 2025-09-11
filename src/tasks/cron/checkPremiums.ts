import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/getAdminUser';
import { decrypt } from '../../services/encrypt';
import Premium from '../../models/premium';

async function buyTelegramPremium(orderId: string): Promise<boolean> {
  const order = await Premium.findById(orderId).populate('botUser');
  try {
    // 查找订单并填充 botUser 字段

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

    order.status = 'failed';
    await order.save();

    return false;
  }
}

export async function checkPremiums() {
  try {
    console.log('[checkPremiums] 开始检查所有待处理的会员订单...');

    // 查找所有pending状态的订单
    const pendingOrders = await Premium.find({
      status: 'pending',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkPremiums] 查询到 ${pendingOrders.length} 个待处理的会员订单`,
    );

    const now = new Date();

    for (const order of pendingOrders) {
      // 检查是否过期
      if (now > order.expiredAt) {
        console.log(
          `[checkPremiums] 订单 ${order.id} 已过期，更新状态为expired`,
        );
        order.status = 'expired';
        await order.save();
        continue;
      }

      // 获取收款地址的USDT交易记录
      const response = await fetchTrc20Transactions(order.to);

      console.log(
        `[checkPremiums] 订单 ${order.id} 收到 ${response.length} 条转账记录`,
      );

      // 过滤出USDT转入记录
      const transfers = response
        .filter((tx) => tx.token_info?.symbol === 'USDT')
        .map((tx) => ({
          transaction_id: tx.transaction_id,
          from_address: tx.from,
          to_address: tx.to,
          amount: Number(tx.value) / 1_000_000, // USDT精度为6
          timestamp: Math.floor(tx.block_timestamp / 1000),
        }));

      // 只计算转入的USDT
      const incomingTransfers = transfers.filter(
        (t) => t.to_address === order.to,
      );

      // 计算总收到的USDT金额
      const totalReceived = incomingTransfers.reduce(
        (sum, transfer) => sum + transfer.amount,
        0,
      );

      // 更新实际收到的金额
      order.actualAmount = totalReceived;

      // 检查是否达到支付金额（允许0.01的误差）
      const AMOUNT_TOLERANCE = 0.01;
      const previousStatus = order.status;
      if (Math.abs(totalReceived - order.amount) <= AMOUNT_TOLERANCE) {
        console.log(
          `[checkPremiums] 订单 ${order.id} 收到足够金额，更新状态为paid`,
        );
        order.status = 'paid';

        // 记录交易信息
        if (incomingTransfers.length > 0) {
          const latestTransfer =
            incomingTransfers[incomingTransfers.length - 1];
          order.from = latestTransfer.from_address;
          order.hash = latestTransfer.transaction_id;
        }
      }

      await order.save();
      console.log(
        `[checkPremiums] 订单 ${order.id} 更新完成，实际收到: ${totalReceived} USDT`,
      );

      // 如果订单状态刚刚从pending变为paid，则为用户购买Telegram Premium
      if (previousStatus !== 'paid' && order.status === 'paid') {
        console.log(
          `[checkPremiums] 订单 ${order.id} 状态变为已支付，开始为用户购买Telegram Premium`,
        );

        try {
          const purchased = await buyTelegramPremium(order._id.toString());
          if (purchased) {
            console.log(
              `[checkPremiums] 订单 ${order.id} 已成功购买Telegram Premium`,
            );
          } else {
            console.error(
              `[checkPremiums] 订单 ${order.id} 购买Telegram Premium失败`,
            );
          }
        } catch (error) {
          console.error(
            `[checkPremiums] 为订单 ${order.id} 购买Telegram Premium时出错:`,
            error,
          );
        }
      }
    }

    console.log('[checkPremiums] 待处理会员订单检查完成');
  } catch (error) {
    console.error('[checkPremiums] 处理待处理会员订单时出错:', error);
  }
}
