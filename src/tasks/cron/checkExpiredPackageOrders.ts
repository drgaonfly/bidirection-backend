import PackageOrder from '../../models/packageOrder';

// 检查过期的套餐订单
export const checkExpiredPackageOrders = async (): Promise<void> => {
  try {
    const now = new Date();

    // 查找所有已过期但状态不是expired的订单
    const expiredOrders = await PackageOrder.find({
      expiredAt: { $lte: now },
      status: 'using',
    });

    if (expiredOrders.length === 0) {
      console.log('[checkExpiredPackageOrders] 没有过期的套餐订单需要处理');
      return;
    }

    console.log(
      `[checkExpiredPackageOrders] 找到 ${expiredOrders.length} 个过期的套餐订单`,
    );

    await PackageOrder.updateMany(
      {
        _id: { $in: expiredOrders.map((order) => order._id) },
      },
      {
        status: 'expired',
        current_times: 0,
      },
    );
  } catch (error) {
    console.error(
      '[checkExpiredPackageOrders] 检查过期套餐订单时发生错误:',
      error,
    );
  }
};
