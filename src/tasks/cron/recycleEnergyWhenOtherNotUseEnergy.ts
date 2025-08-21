// 当他人用了能量就立即回收

import PackageUsageRecord from '../../models/packageUsageRecord';
import {
  fetchEnergyContractCalls,
  genericRecycleEnergyByAmount,
} from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import createDebug from 'debug';

const debug = createDebug('cron:recycleEnergyWhenOtherNotUseEnergy');

/**
 *当他人用了能量就立即回收
 */
export async function recycleEnergyWhenOtherNotUseEnergy() {
  debug('recycleEnergyWhenOtherNotUseEnergy');

  const currentDate = new Date();

  const adminUser = await getAdminUser();

  try {
    console.log(
      '[recycleEnergyWhenOtherNotUseEnergy] 开始检查所有待处理的能量归还订单...',
    );

    const records = await PackageUsageRecord.find({
      status: 'success',
      type: 'other',
    });

    console.log(
      `[recycleEnergyWhenOtherNotUseEnergy] 查询到 ${records.length} 个给他人用的套餐使用记录`,
    );

    for (const record of records) {
      try {
        const results = await fetchEnergyContractCalls(record.address, 1);

        if (results.length === 0) {
          // currentDate 和  result.createdAt 之间的时间差是否超过1小时
          if (
            currentDate.getTime() - record.createdAt.getTime() <
            60 * 60 * 1000
          ) {
            console.log(
              `[recycleEnergyWhenOtherNotUseEnergy] PackageUsageRecord : 给他人用的套餐 ${record.id} 的使用时间还在1小时内, 跳过`,
            );
            continue;
          }

          let tx_id = '';

          try {
            tx_id = await genericRecycleEnergyByAmount(
              record.usedTimes * adminUser.energy_per_times,
              record.address,
              record,
              record.usedTimes,
            );

            console.log(
              `[recycleEnergyWhenOtherNotUseEnergy] 回收能量成功, txid=${tx_id}`,
            );
          } catch (error) {
            console.log(
              `[recycleEnergyWhenOtherNotUseEnergy] 回收能量失败, error=${error}`,
            );
          }
        }
      } catch (sendErr) {
        console.error(
          `[recycleEnergyWhenOtherNotUseEnergy] 能量使用记录失败:`,
          sendErr,
        );

        continue;
      }
    }

    console.log('[recycleEnergyWhenOtherNotUseEnergy] 处理能量使用记录完成');
  } catch (error) {
    console.error(
      '[recycleEnergyWhenOtherNotUseEnergy] 处理能量使用记录出错:',
      error,
    );
  }
}
