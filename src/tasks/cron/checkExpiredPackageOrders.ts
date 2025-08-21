import PackageOrder from '../../models/packageOrder';
import PackageUsageRecord from '../../models/packageUsageRecord';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';

// 检查过期的套餐订单
export const checkExpiredPackageOrders = async (): Promise<void> => {
  try {
    const now = new Date();

    const adminuser = await getAdminUser();

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

    // 轮询过期的套餐订单
    for (const order of expiredOrders) {
      console.log(`[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id}`);

      const packageUsageRecords = await PackageUsageRecord.find({
        packageOrder: order._id,
        isRecycled: false,
        type: 'myself',
      });

      if (packageUsageRecords.length === 0) {
        console.log(
          `[checkExpiredPackageOrders] 过期套餐订单: ${order.id} 的没有给自己用的套餐使用记录, 直接标记为过期后跳过`,
        );

        await PackageOrder.findByIdAndUpdate(order._id, {
          status: 'expired',
        });

        await PackageUsageRecord.updateMany(
          { _id: { $in: packageUsageRecords.map((pur) => pur._id) } },
          { isRecycled: true },
        );

        continue;
      }

      console.log(
        `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的${packageUsageRecords.length}个给自己用的使用记录`,
      );

      for (const record of packageUsageRecords) {
        console.log(
          `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${record.id}`,
        );

        let tx_id = '';

        const energy = adminuser.energy_per_times * record.usedTimes;

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

          record.isRecycled = true;
          await record.save();
        } catch (error) {
          console.log(
            `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${record.id} 的交易记录失败, 跳过`,
          );

          continue;
        }
      }

      order.status = 'expired';
      order.current_times = 0;
      await order.save();

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
