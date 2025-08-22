import PackageUsageRecord from '../../models/packageUsageRecord';
import {
  fetchEnergyContractCalls,
  genericSendEnergy,
} from '../../utils/fetchTransactions';
import EnergyUsage from '../../models/energyUsage';
import createDebug from 'debug';

const debug = createDebug('cron:checkEnergyFlow');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkEnergyFlow() {
  ``;
  debug('checkEnergyFlow');

  try {
    console.log('[checkEnergyFlow] 开始检查所有待处理的能量归还订单...');

    const records = await PackageUsageRecord.find({
      status: 'success',
      recycling_status: 'pending',
    });

    console.log(`[checkEnergyFlow] 查询到 ${records.length} 个套餐使用记录`);

    for (const record of records) {
      if (record.hash) {
        console.log(
          `[checkEnergyFlow]: paackageUsageRecord: ${record._id} 已经发送过能量`,
        );

        continue;
      }

      try {
        const results = await fetchEnergyContractCalls(record.address, 1);

        if (results.length === 0) {
          console.log(
            `[checkEnergyFlow] PackageUsageRecord : ${record.id} 未使用能量, 跳过`,
          );
          continue;
        }

        // 只处理那些哈希不在EnegyUsage表的result
        const existingEnergyUsages = await EnergyUsage.find({
          hash: { $in: results.map((t) => t.txID) },
        }).select('tx_id');

        const existingTxIds = new Set(existingEnergyUsages.map((e) => e.tx_id));

        const deepFilteredResults = results.filter(
          (result) => result.txID && !existingTxIds.has(result.txID),
        );

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

          let tx_id = '';

          const energyUsage = await EnergyUsage.create({
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
            isRecycled: false,
          });

          try {
            tx_id = await genericSendEnergy(
              record.address,
              energy,
              record,
              pens,
            );

            record.hash = tx_id;
            await record.save();

            console.log(`[checkEnergyFlow] 能量使用记录成功, txid=${tx_id}`);
          } catch (error) {
            record.status = 'failed';
            await record.save();

            console.log(`[checkEnergyFlow] 能量使用记录失败, error=${error}`);
          }

          console.log(`[checkEnergyFlow] 能量使用记录成功`, energyUsage);
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
