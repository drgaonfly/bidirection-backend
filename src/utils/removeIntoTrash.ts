import PackageUsageRecord from '../models/packageUsageRecord';
import { IPackageOrder } from '../models/packageOrder';
import Trash from '../models/trash';

// 传入单个过期订单，移除其使用数据到Trash
export const removeOrderUsagesIntoTrash = async (
  order: IPackageOrder,
): Promise<void> => {
  try {
    // 查找该订单的所有使用记录
    const usages = await PackageUsageRecord.find({ packageOrder: order._id });

    if (!usages || usages.length === 0) {
      console.log(
        `[removeOrderUsagesIntoTrash] 订单(${
          order.id || order._id
        }) 没有使用记录`,
      );
      return;
    }

    // 复制到Trash表
    await Trash.insertMany(usages);

    // 删除原始数据
    await PackageUsageRecord.deleteMany({ packageOrder: order._id });

    console.log(
      `[removeOrderUsagesIntoTrash] 订单(${
        order.id || order._id
      }) 的使用数据已移除并复制到trash`,
    );
  } catch (error) {
    console.error('[removeOrderUsagesIntoTrash] 处理订单时发生错误:', error);
  }
};
