import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import MemberOrder from '../../models/memberOrder';

export async function checkMemberOrders() {
  try {
    console.log('[checkMemberOrders] 开始检查所有待处理的会员订单...');

    // 查找所有pending状态的订单
    const pendingOrders = await MemberOrder.find({
      status: 'pending',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkMemberOrders] 查询到 ${pendingOrders.length} 个待处理的会员订单`,
    );

    const now = new Date();

    for (const order of pendingOrders) {
      // 检查是否过期
      if (now > order.endDate) {
        console.log(
          `[checkMemberOrders] 订单 ${order.orderNumber} 已过期，更新状态为expired`,
        );
        order.status = 'expired';
        await order.save();
        continue;
      }

      // 获取收款地址的USDT交易记录
      const response = await fetchTrc20Transactions(order.paymentAddress);

      console.log(
        `[checkMemberOrders] 订单 ${order.orderNumber} 收到 ${response.length} 条转账记录`,
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
        (t) => t.to_address === order.paymentAddress,
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
      if (Math.abs(totalReceived - order.amount) <= AMOUNT_TOLERANCE) {
        console.log(
          `[checkMemberOrders] 订单 ${order.orderNumber} 收到足够金额，更新状态为paid`,
        );
        order.status = 'paid';
      }

      await order.save();
      console.log(
        `[checkMemberOrders] 订单 ${order.orderNumber} 更新完成，实际收到: ${totalReceived} USDT`,
      );
    }

    console.log('[checkMemberOrders] 待处理会员订单检查完成');
  } catch (error) {
    console.error('[checkMemberOrders] 处理待处理会员订单时出错:', error);
  }
}
