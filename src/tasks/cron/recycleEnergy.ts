import PackageUsageRecord from '../../models/packageUsageRecord';
import EnergyUsage from '../../models/energyUsage';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function recycleEnergy() {
  debug('recycleEnergy');

  const adminUser = await getAdminUser();

  try {
    console.log('[recycleEnergy] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const packageUsageRecords = await PackageUsageRecord.find({
      status: 'success',
      type: 'myself',
      recycling_status: 'pending',
    });

    console.log(
      `[recycleEnergy] 查询到 ${packageUsageRecords.length} 个符合条件的套餐使用记录`,
    );

    for (const packageUsageRecord of packageUsageRecords) {
      const energyUsages = await EnergyUsage.find({
        packageUsageRecord: packageUsageRecord._id,
        type: packageUsageRecord.type,
      });

      if (energyUsages.length === 0) {
        console.log(
          `[recycleEnergy]: packageUsageRecord: ${packageUsageRecord.id} 没有能量使用记录，跳过]`,
        );
        continue;
      }

      const used_times = energyUsages.reduce(
        (sum, eu) => sum + (eu.pens || 0),
        0,
      );

      let tx_id = '';

      const used_energy = used_times * adminUser.energy_per_times;

      if (used_times === packageUsageRecord.usedTimes) {
        console.log(
          `[recycleEnergy]: packageUsageRecord: ${packageUsageRecord.id} 能量已用光, 回收]`,
        );

        try {
          tx_id = await genericRecycleEnergyByAmount(
            used_energy,
            packageUsageRecord.address,
            packageUsageRecord,
            used_times,
          );

          await EnergyUsage.updateMany(
            { _id: { $in: energyUsages.map((eu) => eu._id) } },
            { $set: { isRecycled: true } },
          );

          console.log(
            `[recycleEnergy] packageUsageRecord : ${packageUsageRecord.id} 回收能量成功, tx_id=${tx_id}`,
          );
        } catch (error) {
          console.log(`[recycleEnergy] 回收能量失败, ${error}`);
        }
      }

      if (used_times >= adminUser.recycle_min) {
        try {
          tx_id = await genericRecycleEnergyByAmount(
            used_energy,
            packageUsageRecord.address,
            packageUsageRecord,
            used_times,
          );

          await EnergyUsage.updateMany(
            { _id: { $in: energyUsages.map((eu) => eu._id) } },
            { $set: { isRecycled: true } },
          );

          console.log(
            `[recycleEnergy] packageUsageRecord : ${packageUsageRecord.id} 回收能量成功, tx_id=${tx_id}`,
          );
        } catch (error) {
          console.log(`[recycleEnergy] 回收能量失败, ${error}`);
        }
      }
    }

    console.log('[recycleEnergy] 处理回收能量成功');
  } catch (error) {
    console.error('[recycleEnergy] 处理回收能量时出错:', error);
  }
}
