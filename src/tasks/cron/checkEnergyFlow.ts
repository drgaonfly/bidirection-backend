import PackageUsageRecord from '../../models/packageUsageRecord';
import { fetchEnergyContractCalls } from '../../utils/fetchTransactions';
import EnergyUsage from '../../models/energyUsage';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkEnergyFlow() {
  debug('checkEnergyFlow');

  try {
    console.log('[checkEnergyFlow] 开始检查所有待处理的能量归还订单...');

    // 查询所有已完成且到期的租赁订单
    const records = await PackageUsageRecord.find({
      status: 'pending',
    });

    console.log(`[checkEnergyFlow] 查询到 ${records.length} 个套餐使用记录`);

    for (const record of records) {
      try {
        const results = await fetchEnergyContractCalls(record.address, 1);

        for (const result of results) {
          await EnergyUsage.findOneAndUpdate(
            {
              tx_id: result.txID,
            },
            {
              $set: {
                packageUsageRecord: record._id,
                address: record.address,
                consupmtion: result.energy_usage,
                owner: result.owner,
                transactionAt: new Date(result.timestamp),
              },
            },
            { new: true, upsert: true },
          );

          console.log(`[checkEnergyFlow] 能量使用记录成功`, result);
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
