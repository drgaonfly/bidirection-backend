import PackageUsageRecord from '../../models/packageUsageRecord';
import minConsumption from '../../models/minConsumption';
import PackageOrder from '../../models/packageOrder';
import {
  genericRecycleEnergyByAmount,
  genericSendEnergy,
} from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import createDebug from 'debug';

const debug = createDebug('cron:checkMinConsumption');

/**
 * 抽象出创建minConsumption的函数
 */
async function createMinConsumptionRecord(
  packageUsageRecord,
  packageOrder,
  minus,
) {
  try {
    await minConsumption.create({
      bot: packageUsageRecord.bot,
      botUser: packageUsageRecord.botUser,
      proxy: packageUsageRecord.proxy,
      packageOrder: packageOrder._id,
      packageUsageRecord: packageUsageRecord._id,
      minus,
    });

    console.log(
      `[checkMinConsumption] packageUsageRecord : ${packageUsageRecord.id} 扣低消成功`,
    );
  } catch (error) {
    console.log(`[checkMinConsumption] 扣低消失败, ${error}`);
  }
}

/**
 * 每日低消
 */
export async function checkMinConsumption() {
  debug('checkMinConsumption');

  const adminUser = await getAdminUser();

  const energy_per_times = adminUser.energy_per_times;

  try {
    console.log('[checkMinConsumption] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const packageUsageRecords = await PackageUsageRecord.find({
      type: 'myself',
    });

    console.log(
      `[checkMinConsumption] 查询到 ${packageUsageRecords.length} 个套餐使用记录`,
    );

    for (const packageUsageRecord of packageUsageRecords) {
      const packageOrder = await PackageOrder.findById(
        packageUsageRecord.packageOrder,
      );

      if (packageOrder.current_times === 0) {
        console.log(
          `[checkMinConsumption] packageUsageRecord: [${packageUsageRecord.id}] 所归属的套餐订单已无可用笔数，跳过`,
        );

        continue;
      }

      const used_times = packageUsageRecord.today_used_times;

      if (used_times === 0) {
        //used_times === 0, 说明，给自己或给他人充的能量，一点没用，按低消回收
        await PackageOrder.findByIdAndUpdate(
          packageUsageRecord.packageOrder,
          { $inc: { current_times: -2 } },
          { new: true },
        );

        await PackageUsageRecord.findByIdAndUpdate(
          packageUsageRecord._id,
          { $set: { record_value: 2, today_used_times: 0 } },
          { new: true },
        );

        await createMinConsumptionRecord(packageUsageRecord, packageOrder, 2);
      }

      if (used_times === 1) {
        // 回收记录能量
        await genericRecycleEnergyByAmount(
          energy_per_times * packageUsageRecord.record_value,
          packageUsageRecord.address,
          packageUsageRecord,
          packageUsageRecord.record_value,
          'myself',
        );

        // 扣1
        await PackageOrder.findByIdAndUpdate(
          packageUsageRecord.packageOrder,
          { $inc: { current_times: -1 } },
          { new: true },
        );

        // 发送2笔
        const tx_id = await genericSendEnergy(
          packageUsageRecord.address,
          2 * energy_per_times,
          packageUsageRecord,
          1,
          'myself',
        );
        console.log(
          `[checkMinConsumption] 当天使用一笔, 发送2笔能量成功, tx_id=${tx_id}`,
        );

        // 记录值 = 2 & 当天 = 0
        await PackageUsageRecord.findByIdAndUpdate(
          packageUsageRecord._id,
          { $set: { record_value: 2, today_used_times: 0 } },
          { new: true },
        );

        await createMinConsumptionRecord(packageUsageRecord, packageOrder, 2);
      }

      if (used_times >= 2) {
        if (packageUsageRecord.record_value === 2) {
          // 当天 = 0
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { today_used_times: 0 } },
            { new: true },
          );

          await createMinConsumptionRecord(packageUsageRecord, packageOrder, 2);
        }

        if (packageUsageRecord.record_value > 2) {
          // 回收记录能量
          await genericRecycleEnergyByAmount(
            energy_per_times * packageUsageRecord.record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            packageUsageRecord.record_value,
            'myself',
          );

          // 发送2笔
          const tx_id = await genericSendEnergy(
            packageUsageRecord.address,
            2 * energy_per_times,
            packageUsageRecord,
            1,
            'myself',
          );

          console.log(
            `[checkMinConsumption] 当天使用超过2笔, 发送2笔能量成功, tx_id=${tx_id}`,
          );

          // 记录值 = 2 & 当天 = 0
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { record_value: 2, today_used_times: 0 } },
            { new: true },
          );

          await createMinConsumptionRecord(packageUsageRecord, packageOrder, 2);
        }
      }
    }

    console.log('[checkMinConsumption] 处理扣低消成功');
  } catch (error) {
    console.error('[checkMinConsumption] 处理扣低消时出错:', error);
  }
}
