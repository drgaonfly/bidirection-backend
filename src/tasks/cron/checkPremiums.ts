import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import Premium from '../../models/premium';
import { buyTelegramPremium } from '../../utils/buyTelegramPremium';

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
