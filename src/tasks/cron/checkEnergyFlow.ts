import PackageUsageRecord from '../../models/packageUsageRecord';
import {
  fetchEnergyContractCalls,
  genericRecycleEnergyByAmount,
  genericSendEnergy,
} from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import EnergyUsage from '../../models/energyUsage';
import PackageOrder from '../../models/packageOrder';
import createDebug from 'debug';

const debug = createDebug('cron:checkEnergyFlow');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkEnergyFlow() {
  debug('checkEnergyFlow');

  const adminUser = await getAdminUser();

  const preset_value = adminUser.recycle_min; // 最少累计消费笔数

  const energy_per_times = adminUser.energy_per_times;

  try {
    console.log('[checkEnergyFlow] 开始检查所有待处理的能量归还订单...');

    const records = await PackageUsageRecord.find({
      type: 'myself',
    });

    console.log(`[checkEnergyFlow] 查询到 ${records.length} 个套餐使用记录`);

    for (const record of records) {
      console.log(
        `[checkEnergyFlow] 正在处理套餐使用记录: ${record.id}, address: ${record.address}, usedTimes: ${record.usedTimes}`,
      );
      const packageOrder = await PackageOrder.findById(record.packageOrder);

      if (!packageOrder) {
        console.log(
          `[checkEnergyFlow] 未找到对应的套餐订单, 跳过 record.id: ${record.id}`,
        );
        continue;
      }

      console.log(
        `[checkEnergyFlow] 找到套餐订单, packageOrder: ${packageOrder}`,
      );

      if (packageOrder.current_times === 0) {
        console.log(
          `[checkEnergyFlow] PackageUsageRecord : ${record.id} 所属套餐可用笔数已经用光了, 跳过`,
        );
        continue;
      }

      const record_value = record.record_value;

      console.log('[checkEnergyFlow]: record_value:', record_value);

      try {
        const allResults = await fetchEnergyContractCalls(record.address, 5);

        // 筛选出result.timestamp > record.createdAt (Date)的记录
        const results = allResults.filter(
          (result) => result.timestamp > record.createdAt.getTime(),
        );

        console.log(
          `[checkEnergyFlow] 查询到 address: ${record.address} 的能量合约调用结果数量: ${results.length}`,
        );

        // 只处理那些哈希不在EnegyUsage表的result
        const existingEnergyUsages = await EnergyUsage.find({
          tx_id: { $in: results.map((t) => t.txID) },
        }).select('tx_id');

        const existingTxIds = new Set(existingEnergyUsages.map((e) => e.tx_id));

        const deepFilteredResults = results.filter(
          (result) => result.txID && !existingTxIds.has(result.txID),
        );

        console.log(
          `[checkEnergyFlow] 过滤后未记录的能量合约调用数量: ${deepFilteredResults.length}`,
        );

        if (deepFilteredResults.length === 0) {
          console.log(
            `[checkEnergyFlow] PackageUsageRecord : ${record.id} 未使用能量, 跳过`,
          );
          continue;
        }

        const energyUsages = [];

        for (const result of deepFilteredResults) {
          const energy =
            result.energy_usage === 0 ? result.energy_fee : result.energy_usage;

          const bandwidth =
            result.bandwidth_usage === 0
              ? result.bandwidth_fee
              : result.bandwidth_usage;

          let pens = 0;

          if (energy >= 60000 && energy <= 70000) {
            pens = 1; // 约 65k
          }
          if (energy >= 130000 && energy <= 140000) {
            pens = 2; // 约 135k
          }

          console.log(
            `[checkEnergyFlow] 记录能量使用: txID=${result.txID}, energy=${energy}, bandwidth=${bandwidth}, pens=${pens}`,
          );

          const temp = await EnergyUsage.create({
            tx_id: result.txID,
            bot: record.bot,
            botUser: record.botUser,
            proxy: record.proxy,
            packageUsageRecord: record._id,
            type: record.type,
            address: record.address,
            energy,
            bandwidth,
            pens,
            amount: result.data.amount,
            to_address: result.data.to,
            transactionAt: new Date(result.timestamp),
          });

          energyUsages.push(temp);

          console.log(`[checkEnergyFlow] 能量使用记录成功`, temp.tx_id);
        }

        console.log(
          `[checkEnergyFlow] 能量使用记录成功, energyUsages.length: ${energyUsages.length}`,
        );

        const totalPens = energyUsages.reduce(
          (sum, usage) => sum + (usage.pens || 0),
          0,
        );

        console.log(
          `[checkEnergyFlow] 统计本次能量使用总笔数: ${totalPens}, record_value: ${record_value}, preset_value: ${preset_value}`,
        );

        if (totalPens === 1) {
          if (record_value > preset_value) {
            // 回收大小等于记录值的笔数
            console.log(
              `[checkEnergyFlow] record_value > preset_value, 回收能量: ${
                energy_per_times * record_value
              } sun, address: ${record.address}`,
            );

            await genericRecycleEnergyByAmount(
              energy_per_times * record_value,
              record.address,
              record,
              record_value,
            );

            // 发送2笔
            const tx_id = await genericSendEnergy(
              record.address,
              2 * energy_per_times,
              record,
              1,
              'myself',
            );
            console.log(
              `[checkEnergyFlow] totalPen = 1 , 发送2笔能量成功, tx_id=${tx_id}`,
            );

            // 扣 1 笔
            packageOrder.current_times -= 1;
            await packageOrder.save();

            // 记录设为2
            record.record_value = 2;
            await record.save();
            console.log(
              `[checkEnergyFlow] 已回收并发送2笔, 扣减套餐1笔, 剩余 current_times: ${packageOrder.current_times}`,
            );
          }

          // 发送1笔
          const tx_id = await genericSendEnergy(
            record.address,
            1 * energy_per_times,
            record,
            1,
            'myself',
          );
          console.log(
            `[checkEnergyFlow] totalPen = 1 , 发送1笔能量成功, tx_id=${tx_id}`,
          );

          // 并记录+1
          await PackageUsageRecord.findOneAndUpdate(
            { _id: record._id },
            { $inc: { record_value: 1 } },
          );
          console.log(
            `[checkEnergyFlow] 发送1笔后, record_value 增加到: ${record_value}`,
          );
        }

        if (totalPens === 2) {
          if (record_value > preset_value) {
            // 回收大小等于记录值得笔数
            console.log(
              `[checkEnergyFlow] record_value > preset_value, 回收能量: ${
                energy_per_times * record_value
              } sun, address: ${record.address}`,
            );
            await genericRecycleEnergyByAmount(
              energy_per_times * record_value,
              record.address,
              record,
              record_value,
            );

            // 发送2笔
            const tx_id = await genericSendEnergy(
              record.address,
              2 * energy_per_times,
              record,
              2,
              'myself',
            );
            console.log(
              `[checkEnergyFlow] totalPen = 2 , 发送2笔能量成功, tx_id=${tx_id}`,
            );

            // 扣 2 笔
            packageOrder.current_times -= 2;
            await packageOrder.save();

            // 记录设为2
            record.record_value = 2;
            await record.save();
            console.log(
              `[checkEnergyFlow] 已回收并发送2笔, 扣减套餐2笔, 剩余 current_times: ${packageOrder.current_times}`,
            );
          }

          // 发送2笔
          const tx_id = await genericSendEnergy(
            record.address,
            2 * energy_per_times,
            record,
            2,
            'myself',
          );
          console.log(
            `[checkEnergyFlow] totalPen = 2 , 发送2笔能量成功, tx_id=${tx_id}`,
          );

          // 并记录值+2
          await PackageUsageRecord.findOneAndUpdate(
            { _id: record._id },
            { $inc: { record_value: 2 } },
          );
          console.log(
            `[checkEnergyFlow] 发送2笔后, record_value 增加到: ${record_value}`,
          );
        }
      } catch (sendErr) {
        console.error(`[checkEnergyFlow] 能量使用记录失败:`, sendErr);

        continue;
      }
    }

    console.log('[checkEnergyFlow] 处理能量使用记录完成');
  } catch (error) {
    console.error('[checkEnergyFlow] 处理能量使用记录出错:', error);
  }
}
