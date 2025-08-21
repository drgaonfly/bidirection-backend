import PackageUsageRecord from '../../models/packageUsageRecord';
import EnergyUsage from '../../models/energyUsage';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('cron:recycleEnergyDaily');

/**
 * 每日回收给自己用的套餐使用记录的能量
 */
export async function recycleEnergyDaily() {
  debug('recycleEnergyDaily');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 昨天 0 点
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const adminUser = await getAdminUser();

  try {
    console.log('[recycleEnergyDaily] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const packageUsageRecords = await PackageUsageRecord.find({
      status: 'success',
      isRecycled: false,
      type: 'myself',
    });

    console.log(
      `[recycleEnergyDaily] 查询到 ${packageUsageRecords.length} 个给自己用的套餐使用记录`,
    );

    for (const packageUsageRecord of packageUsageRecords) {
      const energyUsages = await EnergyUsage.find({
        packageUsageRecord: packageUsageRecord._id,
        isRecycled: false,
        createdAt: {
          $gte: yesterday,
          $lt: today,
        },
      });

      if (energyUsages.length === 0) {
        console.log(
          `[recycleEnergyDaily]: packageUsageRecord: ${packageUsageRecord.id} 没有能量使用记录，跳过]`,
        );
        continue;
      }

      const used_times = energyUsages.reduce(
        (sum, eu) => sum + (eu.pens || 0),
        0,
      );

      const used_energy = used_times * adminUser.energy_per_times;

      let tx_id = '';

      if (used_times >= adminUser.recycle_min) {
        try {
          tx_id = await genericRecycleEnergyByAmount(
            used_energy,
            packageUsageRecord.address,
          );

          await EnergyUsage.updateMany(
            { _id: { $in: energyUsages.map((eu) => eu._id) } },
            { $set: { isRecycled: true } },
          );

          packageUsageRecord.isRecycled = true;
          await packageUsageRecord.save();

          console.log(
            `[recycleEnergyDaily] packageUsageRecord : ${packageUsageRecord.id} 回收能量成功, tx_id=${tx_id}`,
          );
        } catch (error) {
          console.log(`[recycleEnergyDaily] 回收能量失败, ${error}`);
        }
      }
    }

    console.log('[recycleEnergyDaily] 处理回收能量成功');
  } catch (error) {
    console.error('[recycleEnergyDaily] 处理回收能量时出错:', error);
  }
}
