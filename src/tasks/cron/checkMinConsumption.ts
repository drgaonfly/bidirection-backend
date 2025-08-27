import PackageUsageRecord from '../../models/packageUsageRecord';
import minConsumption from '../../models/minConsumption';
import PackageOrder from '../../models/packageOrder';
import {
  genericRecycleEnergyByAmount,
  genericSendEnergy,
} from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { removeOrderUsagesIntoTrash } from '../../utils/removeIntoTrash';
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
      `[checkMinConsumption][createMinConsumptionRecord] packageUsageRecord: ${packageUsageRecord.id} 扣低消成功，minus: ${minus}`,
    );
  } catch (error) {
    console.log(
      `[checkMinConsumption][createMinConsumptionRecord] 扣低消失败, packageUsageRecord: ${packageUsageRecord.id}, error: ${error}`,
    );
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
    console.log(
      '[checkMinConsumption][start] 开始检查所有待处理的套餐使用记录...',
    );

    // 查询所有已完成的套餐使用记录
    const packageUsageRecords = await PackageUsageRecord.find({
      type: 'myself',
    });

    console.log(
      `[checkMinConsumption][start] 查询到 ${packageUsageRecords.length} 个套餐使用记录`,
    );

    for (const packageUsageRecord of packageUsageRecords) {
      const packageOrder = await PackageOrder.findById(
        packageUsageRecord.packageOrder,
      );

      const record_value = packageUsageRecord.record_value;

      console.log(`[checkMinConsumption] record_value: ${record_value} `);

      // 判断套餐订单是否已过期
      if (
        packageOrder.expiredAt &&
        new Date(packageOrder.expiredAt) <= new Date()
      ) {
        console.log(
          `[checkMinConsumption][expired] packageUsageRecord: [${packageUsageRecord.id}] 所归属的套餐订单已过期, packageOrder: [${packageOrder._id}]`,
        );

        // 回收记录值能量
        await genericRecycleEnergyByAmount(
          energy_per_times * record_value,
          packageUsageRecord.address,
          packageUsageRecord,
          record_value,
          'myself',
        );
        console.log(
          `[checkMinConsumption][expired] 能量回收成功, packageUsageRecord: [${
            packageUsageRecord.id
          }], 回收能量: ${energy_per_times * record_value}`,
        );

        // 创建低销记录
        await createMinConsumptionRecord(packageUsageRecord, packageOrder, 2);

        // 更新套餐订单状态
        packageOrder.status = 'expired';
        await packageOrder.save();
        await removeOrderUsagesIntoTrash(packageOrder);

        console.log(
          `[checkMinConsumption][expired] packageOrder: [${packageOrder._id}] 状态已更新为 expired`,
        );
      }

      const used_times = packageUsageRecord.today_used_times;

      if (packageOrder.current_times === 0) {
        console.log(
          `[checkMinConsumption][current_times=0] packageUsageRecord: [${packageUsageRecord.id}] 所归属的套餐订单已无可用笔数, used_times: ${used_times}, record_value: ${record_value}`,
        );

        if (used_times >= 2) {
          if (record_value > 2) {
            // 回收记录值能量
            console.log(
              `[checkMinConsumption][current_times=0][used_times>=2][record_value>2] 能量回收成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 回收能量: ${energy_per_times * record_value}`,
            );

            await genericRecycleEnergyByAmount(
              energy_per_times * record_value,
              packageUsageRecord.address,
              packageUsageRecord,
              record_value,
              'myself',
            );

            // 发送 2 笔能量
            console.log(
              `[checkMinConsumption][current_times=0][used_times>=2][record_value>2] 发送2笔能量成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 发送能量: ${2 * energy_per_times}`,
            );
            await genericSendEnergy(
              packageUsageRecord.address,
              2 * energy_per_times,
              packageUsageRecord,
              2,
              'myself',
            );

            // 记录值 = 2 & 当天 = 0
            console.log(
              `[checkMinConsumption][current_times=0][used_times>=2][record_value>2] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { record_value: 2, today_used_times: 0 } },
              { new: true },
            );
          }

          if (record_value === 2) {
            console.log(
              `[checkMinConsumption][current_times=0][used_times>=2][record_value=2] 更新today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { today_used_times: 0 } },
              { new: true },
            );
          }

          if (record_value === 1) {
            console.log(
              `[checkMinConsumption][current_times=0][used_times>=2][record_value=1] 更新record_value=1, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { record_value: 1, today_used_times: 0 } },
              { new: true },
            );
          }
        }

        if (used_times === 1) {
          // 回收记录能量
          await genericRecycleEnergyByAmount(
            energy_per_times * record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            record_value,
            'myself',
          );
          console.log(
            `[checkMinConsumption][current_times=0][used_times=1] 能量回收成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 回收能量: ${energy_per_times * record_value}`,
          );

          // 创建低销记录
          await createMinConsumptionRecord(packageUsageRecord, packageOrder, 1);

          // 更新套餐订单状态
          packageOrder.status = 'expired';
          await packageOrder.save();
          await removeOrderUsagesIntoTrash(packageOrder);

          console.log(
            `[checkMinConsumption][current_times=0][used_times=1] packageOrder: [${packageOrder._id}] 状态已更新为 expired`,
          );
        }

        if (used_times === 0) {
          // 回收记录能量
          await genericRecycleEnergyByAmount(
            energy_per_times * record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            record_value,
            'myself',
          );
          console.log(
            `[checkMinConsumption][current_times=0][used_times=0] 能量回收成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 回收能量: ${energy_per_times * record_value}`,
          );

          // 创建低销记录
          await createMinConsumptionRecord(
            packageUsageRecord,
            packageOrder,
            record_value,
          );

          // 更新套餐订单状态
          packageOrder.status = 'expired';
          await packageOrder.save();
          await removeOrderUsagesIntoTrash(packageOrder);

          console.log(
            `[checkMinConsumption][current_times=0][used_times=0] packageOrder: [${packageOrder._id}] 状态已更新为 expired`,
          );
        }
      }

      if (packageOrder.current_times === 1) {
        console.log(
          `[checkMinConsumption][current_times=1] packageUsageRecord: [${packageUsageRecord.id}] 所归属的套餐订单剩1笔, used_times: ${used_times}, record_value: ${record_value}`,
        );

        if (used_times >= 2) {
          if (record_value === 2) {
            console.log(
              `[checkMinConsumption][current_times=1][used_times>=2][record_value=2] 更新today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { today_used_times: 0 } },
              { new: true },
            );
          }

          if (record_value > 2) {
            // 回收记录能量
            console.log(
              `[checkMinConsumption][current_times=1][used_times>=2][record_value>2] 能量回收成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 回收能量: ${energy_per_times * record_value}`,
            );
            await genericRecycleEnergyByAmount(
              energy_per_times * record_value,
              packageUsageRecord.address,
              packageUsageRecord,
              record_value,
              'myself',
            );

            // 发送 2 笔能量
            console.log(
              `[checkMinConsumption][current_times=1][used_times>=2][record_value>2] 发送2笔能量成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 发送能量: ${2 * energy_per_times}`,
            );
            await genericSendEnergy(
              packageUsageRecord.address,
              2 * energy_per_times,
              packageUsageRecord,
              2,
              'myself',
            );

            console.log(
              `[checkMinConsumption][current_times=1][used_times>=2][record_value>2] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { record_value: 2, today_used_times: 0 } },
              { new: true },
            );
          }
        }

        if (used_times === 1) {
          // 回收记录能量
          console.log(
            `[checkMinConsumption][current_times=1][used_times=1] 能量回收成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 回收能量: ${energy_per_times * record_value}`,
          );
          await genericRecycleEnergyByAmount(
            energy_per_times * record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            record_value,
            'myself',
          );

          // 发送 2 笔能量
          console.log(
            `[checkMinConsumption][current_times=1][used_times=1] 发送2笔能量成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 发送能量: ${2 * energy_per_times}`,
          );
          await genericSendEnergy(
            packageUsageRecord.address,
            2 * energy_per_times,
            packageUsageRecord,
            2,
            'myself',
          );

          // 扣除可用笔数1笔
          console.log(
            `[checkMinConsumption][current_times=1][used_times=1] packageOrder: [${packageOrder._id}] current_times -1`,
          );
          await PackageOrder.findByIdAndUpdate(
            packageOrder._id,
            {
              $inc: { current_times: -1 },
            },
            { new: true },
          );

          // 记录值 = 2 & 当天用量 = 0
          console.log(
            `[checkMinConsumption][current_times=1][used_times=1] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
          );
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { record_value: 2, today_used_times: 0 } },
            { new: true },
          );

          // 创建低销记录
          await createMinConsumptionRecord(packageUsageRecord, packageOrder, 1);
        }

        if (used_times === 0) {
          // 回收记录能量
          console.log(
            `[checkMinConsumption][current_times=1][used_times=1] 能量回收成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 回收能量: ${energy_per_times * record_value}`,
          );
          await genericRecycleEnergyByAmount(
            energy_per_times * record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            record_value,
            'myself',
          );

          // 发送 1 笔能量
          console.log(
            `[checkMinConsumption][current_times=1][used_times=0] 发送1笔能量成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 发送能量: ${1 * energy_per_times}`,
          );
          await genericSendEnergy(
            packageUsageRecord.address,
            1 * energy_per_times,
            packageUsageRecord,
            1,
            'myself',
          );

          // 扣可用笔数1笔
          console.log(
            `[checkMinConsumption][current_times=1][used_times=0] packageOrder: [${packageOrder._id}] current_times -1`,
          );

          await PackageOrder.findByIdAndUpdate(
            packageOrder._id,
            {
              $inc: { current_times: -1 },
            },
            { new: true },
          );

          // 记录值 = 1 & 当天 = 0
          console.log(
            `[checkMinConsumption][current_times=1][used_times=0] 更新record_value=1, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
          );
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { record_value: 1, today_used_times: 0 } },
            { new: true },
          );

          // 创建低销记录
          await createMinConsumptionRecord(packageUsageRecord, packageOrder, 1);
        }
      }

      if (packageOrder.current_times >= 2) {
        if (used_times >= 2) {
          // 当天 = 0
          console.log(
            `[checkMinConsumption][current_times>=2][used_times>=2][record_value=2] packageOrder: [${packageOrder._id}] current_times 设为0`,
          );
          if (record_value === 2) {
            await PackageUsageRecord.findByIdAndUpdate(
              packageOrder._id,
              {
                $set: { today_used_times: 0 },
              },
              { new: true },
            );
          }

          if (record_value > 2) {
            // 回收记录能量
            console.log(
              `[checkMinConsumption][current_times>=2][used_times>=2][record_value>2] 能量回收成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 回收能量: ${energy_per_times * record_value}`,
            );
            await genericRecycleEnergyByAmount(
              energy_per_times * record_value,
              packageUsageRecord.address,
              packageUsageRecord,
              record_value,
              'myself',
            );

            // 发送 2 笔能量
            console.log(
              `[checkMinConsumption][current_times>=2][used_times>=2][record_value>2] 发送2笔能量成功, packageUsageRecord: [${
                packageUsageRecord.id
              }], 发送能量: ${2 * energy_per_times}`,
            );
            await genericSendEnergy(
              packageUsageRecord.address,
              2 * energy_per_times,
              packageUsageRecord,
              2,
              'myself',
            );

            // 记录值 = 2 & 当天 = 0
            console.log(
              `[checkMinConsumption][current_times>=2][used_times>=2][record_value>2] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
            );
            await PackageUsageRecord.findByIdAndUpdate(
              packageUsageRecord._id,
              { $set: { record_value: 2, today_used_times: 0 } },
              { new: true },
            );
          }
        }

        if (used_times === 1) {
          // 回收记录能量
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=1] 能量回收成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 回收能量: ${energy_per_times * record_value}`,
          );
          await genericRecycleEnergyByAmount(
            energy_per_times * record_value,
            packageUsageRecord.address,
            packageUsageRecord,
            record_value,
            'myself',
          );

          // 发送 2 笔能量
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=1] 发送2笔能量成功, packageUsageRecord: [${
              packageUsageRecord.id
            }], 发送能量: ${2 * energy_per_times}`,
          );
          await genericSendEnergy(
            packageUsageRecord.address,
            2 * energy_per_times,
            packageUsageRecord,
            2,
            'myself',
          );

          // 扣可用笔数1笔
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=1] packageOrder: [${packageOrder._id}] current_times -1`,
          );
          await PackageOrder.findByIdAndUpdate(
            packageOrder._id,
            {
              $inc: { current_times: -1 },
            },
            { new: true },
          );

          // 记录值 = 2 & 当天 = 0
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=1] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
          );
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { record_value: 2, today_used_times: 0 } },
            { new: true },
          );
        }

        if (used_times === 0) {
          // 扣除可用笔数2笔
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=0] packageOrder: [${packageOrder._id}] current_times -2`,
          );
          await PackageOrder.findByIdAndUpdate(
            packageOrder._id,
            {
              $inc: { current_times: -2 },
            },
            { new: true },
          );

          // 记录值 = 2 & 当天 = 0
          console.log(
            `[checkMinConsumption][current_times>=2][used_times=0] 更新record_value=2, today_used_times=0, packageUsageRecord: [${packageUsageRecord.id}]`,
          );
          await PackageUsageRecord.findByIdAndUpdate(
            packageUsageRecord._id,
            { $set: { record_value: 2, today_used_times: 0 } },
            { new: true },
          );
        }
      }
    }

    console.log('[checkMinConsumption][end] 处理扣低消成功');
  } catch (error) {
    console.error('[checkMinConsumption][error] 处理扣低消时出错:', error);
  }
}
