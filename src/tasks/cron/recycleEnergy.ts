import PackageUsageRecord from '../../models/packageUsageRecord';
// import EnergyUsage from '../../models/energyUsage';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

// 预设时间（分钟），比如 24 小时 = 1440 分钟

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function recycleEnergy() {
  debug('recycleEnergy');

  const adminUser = await getAdminUser();

  const quick_recycle_time = adminUser.quick_recycle_time;

  if (!quick_recycle_time) {
    console.log('[recycleEnergy] 没有预设快速回收时间');
    return;
  }

  try {
    console.log('[recycleEnergy] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const packageUsageRecords = await PackageUsageRecord.find({
      status: 'success',
      type: 'other',
      recycling_status: 'pending',
    });

    console.log(
      `[recycleEnergy] 查询到 ${packageUsageRecords.length} 个符合条件的套餐使用记录`,
    );

    const now = Date.now();

    for (const packageUsageRecord of packageUsageRecords) {
      // const energyUsages = await EnergyUsage.find({
      //   packageUsageRecord: packageUsageRecord._id,
      //   type: packageUsageRecord.type,
      // });

      // if (energyUsages.length === 0) {
      //   console.log(
      //     `[recycleEnergy]: packageUsageRecord: ${packageUsageRecord.id} 没有能量使用记录，跳过]`,
      //   );
      //   continue;
      // }

      // const used_times = energyUsages.reduce(
      //   (sum, eu) => sum + (eu.pens || 0),
      //   0,
      // );

      let tx_id = '';

      const used_energy =
        packageUsageRecord.usedTimes * adminUser.energy_per_times;

      // 判断 createdAt 与当前时间的差是否大于等于预设时间（分钟）
      const createdAt = packageUsageRecord.createdAt.getTime();
      const diff = now - createdAt;

      if (diff >= quick_recycle_time * 60 * 1000) {
        console.log(
          `[recycleEnergy]: packageUsageRecord: ${packageUsageRecord.id} 已超过预设时间(${quick_recycle_time}分钟), 回收]`,
        );

        try {
          tx_id = await genericRecycleEnergyByAmount(
            used_energy,
            packageUsageRecord.address,
            packageUsageRecord,
            packageUsageRecord.usedTimes,
          );

          // await EnergyUsage.updateMany(
          //   { _id: { $in: energyUsages.map((eu) => eu._id) } },
          //   { $set: { isRecycled: true } },
          // );

          console.log(
            `[recycleEnergy] packageUsageRecord : ${packageUsageRecord.id} 回收能量成功, tx_id=${tx_id}`,
          );
        } catch (error) {
          console.log(`[recycleEnergy] 回收能量失败, ${error}`);
        }
      } else {
        console.log(
          `[recycleEnergy]: packageUsageRecord: ${packageUsageRecord.id} 未超过预设时间, 跳过]`,
        );
      }
    }

    console.log('[recycleEnergy] 处理回收能量成功');
  } catch (error) {
    console.error('[recycleEnergy] 处理回收能量时出错:', error);
  }
}
