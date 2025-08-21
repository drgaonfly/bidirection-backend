import { TronWeb } from 'tronweb';
import PackageOrder from '../../models/packageOrder';
import PackageUsageRecord from '../../models/packageUsageRecord';
import UnRental from '../../models/unrental';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { decrypt } from '../../services/encrypt';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

// 检查过期的套餐订单
export const checkExpiredPackageOrders = async (): Promise<void> => {
  try {
    const now = new Date();

    const adminuser = await getAdminUser();

    const decryptedPrivateKey = decrypt(adminuser.energy_privateKey);

    const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址

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

      const purs = await PackageUsageRecord.find({
        packageOrder: order._id,
        isRecycled: false,
      });

      if (purs.length === 0) {
        console.log(
          `[checkExpiredPackageOrders] 过期套餐订单: ${order.id} 的没有使用记录, 直接标记为过期后跳过`,
        );

        await PackageOrder.findByIdAndUpdate(order._id, {
          status: 'expired',
        });

        await PackageUsageRecord.updateMany(
          { _id: { $in: purs.map((pur) => pur._id) } },
          { isRecycled: true },
        );

        continue;
      }

      console.log(
        `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的${purs.length}个使用记录`,
      );

      for (const pur of purs) {
        console.log(
          `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${pur.id}`,
        );

        let tx_id = '';

        const energy = adminuser.energy_per_times * pur.usedTimes;

        const unRental = await UnRental.findOneAndUpdate(
          {
            packageUsageRecord: pur._id,
          },
          {
            $set: {
              bot: pur.bot,
              botUser: pur.botUser,
              proxy: pur.proxy,
              from: adminuser.energy_address, // 使用 B 地址（放能量的地址）
              to: pur.address,
              energySendAddress: fromAddress,
              separation: pur.usedTimes,
              amount: energy,
              status: 'pending',
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

        try {
          tx_id = await genericRecycleEnergyByAmount(energy, pur.address);

          unRental.status = 'success';
          unRental.txid = tx_id;
          await unRental.save();

          pur.isRecycled = true;
          await pur.save();
        } catch (error) {
          console.log(
            `[checkExpiredPackageOrders] 处理过期套餐订单: ${order.id} 的使用记录: ${pur.id} 的交易记录失败, 跳过`,
          );

          unRental.status = 'failed';
          await unRental.save();

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
