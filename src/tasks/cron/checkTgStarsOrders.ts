import { fetchTrc20Transactions } from '../../utils/fetchTransactions';
import TgStarsOrder from '../../models/tgStarsOrder';
import { buyTelegramStars } from '../../utils/buyTelegramStars';

export async function checkTgStarsOrders() {
  try {
    console.log('[checkTgStarsOrders] 开始检查所有待处理的Stars订单...');

    // 查找所有pending状态的订单
    const pendingOrders = await TgStarsOrder.find({
      status: 'pending',
    })
      .populate('botUser')
      .populate('bot');

    console.log(
      `[checkTgStarsOrders] 查询到 ${pendingOrders.length} 个待处理的Stars订单`,
    );

    const now = new Date();

    for (const order of pendingOrders) {
      // 检查是否过期
      if (now > order.endDate) {
        console.log(
          `[checkTgStarsOrders] 订单 ${order.orderNumber} 已过期，更新状态为expired`,
        );
        order.status = 'expired';
        await order.save();
        continue;
      }

      // 获取收款地址的USDT交易记录
      const response = await fetchTrc20Transactions(order.paymentAddress);

      console.log(
        `[checkTgStarsOrders] 订单 ${order.orderNumber} 收到 ${response.length} 条转账记录`,
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
      const previousStatus = order.status;
      if (Math.abs(totalReceived - order.amount) <= AMOUNT_TOLERANCE) {
        console.log(
          `[checkTgStarsOrders] 订单 ${order.orderNumber} 收到足够金额，更新状态为completed`,
        );
        order.status = 'paid';
      }

      await order.save();
      console.log(
        `[checkTgStarsOrders] 订单 ${order.orderNumber} 更新完成，实际收到: ${totalReceived} USDT`,
      );

      // 如果订单状态刚刚从pending变为completed，则为用户购买Telegram Stars
      if (
        previousStatus !== 'paid' &&
        order.status === 'paid' &&
        !order.hasPurchased
      ) {
        console.log(
          `[checkTgStarsOrders] 订单 ${order.orderNumber} 状态变为已支付，开始为用户购买Telegram Stars`,
        );

        try {
          const purchased = await buyTelegramStars(order._id.toString());
          if (purchased) {
            console.log(
              `[checkTgStarsOrders] 订单 ${order.orderNumber} 已成功购买Telegram Stars`,
            );
          } else {
            console.error(
              `[checkTgStarsOrders] 订单 ${order.orderNumber} 购买Telegram Stars失败`,
            );
          }
        } catch (error) {
          console.error(
            `[checkTgStarsOrders] 为订单 ${order.orderNumber} 购买Telegram Stars时出错:`,
            error,
          );
        }
      }
    }

    console.log('[checkTgStarsOrders] 待处理Stars订单检查完成');
  } catch (error) {
    console.error('[checkTgStarsOrders] 处理待处理Stars订单时出错:', error);
  }
}
