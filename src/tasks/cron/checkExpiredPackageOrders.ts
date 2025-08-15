import PackageOrder from '../../models/packageOrder';

// 检查过期的套餐订单
export const checkExpiredPackageOrders = async (): Promise<void> => {
  try {
    const now = new Date();

    // 查找所有已过期但状态不是expired的订单
    const expiredOrders = await PackageOrder.find({
      expiredAt: { $lte: now },
      status: { $nin: ['expired', 'completed'] },
    });

    if (expiredOrders.length === 0) {
      console.log('[checkExpiredPackageOrders] 没有过期的套餐订单需要处理');
      return;
    }

    console.log(
      `[checkExpiredPackageOrders] 找到 ${expiredOrders.length} 个过期的套餐订单`,
    );

    // 批量更新过期订单的状态
    const updatePromises = expiredOrders.map((order) =>
      PackageOrder.findByIdAndUpdate(order._id, {
        status: 'expired',
        $set: { updatedAt: now },
      }),
    );

    await Promise.all(updatePromises);

    console.log(
      `[checkExpiredPackageOrders] 成功更新 ${expiredOrders.length} 个过期套餐订单的状态`,
    );

    // 记录过期的订单详情
    expiredOrders.forEach((order) => {
      console.log(
        `[checkExpiredPackageOrders] 套餐订单 ${order.id} 已过期，用户: ${order.botUser}, 机器人: ${order.bot}`,
      );
    });
  } catch (error) {
    console.error(
      '[checkExpiredPackageOrders] 检查过期套餐订单时发生错误:',
      error,
    );
  }
};
