import PackageOrder from '../../models/packageOrder';
import PackageUsageRecord from '../../models/packageUsageRecord';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';

// 检查过期的套餐订单
export const checkExpiredPackageOrders = async (): Promise<void> => {
  try {
    const now = new Date();

    const adminUser = await getAdminUser();

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

    // 轮询过期的套餐订单
    for (const order of expiredOrders) {
      console.log(`[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id}`);

      const packageUsageRecords = await PackageUsageRecord.find({
        packageOrder: order._id,
        isRecycled: false,
      });

      if (packageUsageRecords.length === 0) {
        console.log(
          `[checkExpiredPackageOrders] 过期套餐订单: ${order.id} 的没有套餐使用记录, 直接标记为过期后跳过`,
        );

        await PackageOrder.findByIdAndUpdate(order._id, {
          status: 'expired',
        });

        continue;
      }

      console.log(
        `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的${packageUsageRecords.length}个使用记录`,
      );

      for (const record of packageUsageRecords) {
        console.log(
          `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${record.id}`,
        );

        let tx_id = '';

        const energy = adminUser.energy_per_times * record.usedTimes;

        try {
          tx_id = await genericRecycleEnergyByAmount(
            energy,
            record.address,
            record,
            record.usedTimes,
          );

          console.log(
            `[checkExpiredPackageOrders] 能量回收成功, txid=${tx_id}`,
          );
        } catch (error) {
          console.log(
            `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${record.id} 的交易记录失败, 跳过`,
          );

          continue;
        }
      }

      console.log(
        `[checkExpiredPackageOrders] 套餐订单: ${order.id} 已设置为过期，笔数清零`,
      );
    }
  } catch (error) {
    console.error(
      '[checkExpiredPackageOrders] 检查过期套餐订单时发生错误:',
      error,
    );
  }
};
