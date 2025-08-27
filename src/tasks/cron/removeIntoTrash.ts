import PackageUsageRecord from '../../models/packageUsageRecord';
import PackageOrder from '../../models/packageOrder';
import Trash from '../../models/trash';

// 检查过期的套餐订单
export const removeIntoTrash = async (): Promise<void> => {
  try {
    // 查找所有已过期但状态不是expired的订单
    const expiredOrders = await PackageOrder.find({
      status: 'expired',
    });

    if (expiredOrders.length === 0) {
      console.log('[removeIntoTrash] 没有过期的套餐订单需要处理');
      return;
    }

    console.log(
      `[removeIntoTrash] 找到 ${expiredOrders.length} 个过期的套餐订单`,
    );

    for (const order of expiredOrders) {
      const usages = await PackageUsageRecord.findOne({
        packageOrder: order._id,
      });

      // 复制到Trash表
      await Trash.insertMany(usages);

      // 删除原始数据
      await PackageUsageRecord.deleteMany({ packageOrder: order._id });

      console.log('[removeIntoTrash] 过期订单的使用数据已经移除并复制到trash:');
    }
  } catch (error) {
    console.error('[removeIntoTrash] 检查过期套餐订单时发生错误:', error);
  }
};
