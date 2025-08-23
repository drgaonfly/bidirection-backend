// 当他人用了能量就立即回收

import PackageUsageRecord from '../../models/packageUsageRecord';
import {
  fetchEnergyContractCalls,
  genericRecycleEnergyByAmount,
} from '../../utils/fetchTransactions';
import EnergyUsage from '../../models/energyUsage';
import createDebug from 'debug';

const debug = createDebug('cron:recycleEnergyWhenOtherUseEnergy');

/**
 *当他人用了能量就立即回收
 */
export async function recycleEnergyWhenOtherUseEnergy() {
  debug('recycleEnergyWhenOtherUseEnergy');

  try {
    console.log(
      '[recycleEnergyWhenOtherUseEnergy] 开始检查所有待处理的能量归还订单...',
    );

    const records = await PackageUsageRecord.find({
      status: 'success',
      type: 'other',
      recycling_status: 'pending',
    });

    console.log(
      `[recycleEnergyWhenOtherUseEnergy] 查询到 ${records.length} 个给他人用的套餐使用记录`,
    );

    for (const record of records) {
      try {
        const results = await fetchEnergyContractCalls(record.address, 1);

        if (results.length === 0) {
          console.log(
            `[recycleEnergyWhenOtherUseEnergy] PackageUsageRecord : ${record.id} 未发现能量使用, 跳过`,
          );
          continue;
        }

        for (const result of results) {
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

          let tx_id = '';

          const energyUsage = await EnergyUsage.create({
            tx_id: result.txID,
            bot: record.bot,
            botUser: record.botUser,
            proxy: record.proxy,
            packageUsageRecord: record._id,
            type: record,
            address: record.address,
            energy,
            bandwidth,
            pens,
            amount: result.data.amount,
            to_address: result.data.to,
            transactionAt: new Date(result.timestamp),
          });

          try {
            tx_id = await genericRecycleEnergyByAmount(
              energy,
              record.address,
              record,
              pens,
            );

            energyUsage.isRecycled = true;
            await energyUsage.save();

            console.log(
              `[recycleEnergyWhenOtherUseEnergy] 回收能量成功, txid=${tx_id}`,
            );
          } catch (error) {
            console.log(
              `[recycleEnergyWhenOtherUseEnergy] 回收能量失败, error=${error}`,
            );
          }

          console.log(
            `[recycleEnergyWhenOtherUseEnergy] 能量使用记录成功`,
            energyUsage,
          );
        }
      } catch (sendErr) {
        console.error(
          `[recycleEnergyWhenOtherUseEnergy] 能量使用记录失败:`,
          sendErr,
        );

        continue;
      }
    }

    console.log('[recycleEnergyWhenOtherUseEnergy] 处理能量使用记录完成');
  } catch (error) {
    console.error(
      '[recycleEnergyWhenOtherUseEnergy] 处理能量使用记录出错:',
      error,
    );
  }
}
