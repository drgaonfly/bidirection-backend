import Rental from '../../models/rental';
import { unRentEnergy } from '../../utils/fetchTransactions';
import { fetchEnergyContractCalls } from '../../utils/fetchTransactions';
import EnergyUsage from '../../models/energyUsage';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoUnRentals');

/**
 * 获取并记录能量使用情况,并返回总笔数
 */
async function processEnergyUsage(rental: any) {
  console.log(`[processEnergyUsage] 开始处理 record.id=${rental.id}`);

  const allResults = await fetchEnergyContractCalls(rental.from_address, 5);

  // 筛选出 result.timestamp > record.createdAt (Date) 的记录
  const results = allResults.filter(
    (result) => result.timestamp > rental.createdAt.getTime(),
  );

  console.log(
    `[processEnergyUsage] 查询到 address: ${rental.address} 的能量合约调用结果数量: ${results.length}`,
  );

  // 只处理那些哈希不在 EnergyUsage 表的 result
  const existingEnergyUsages = await EnergyUsage.find({
    tx_id: { $in: results.map((t) => t.txID) },
  }).select('tx_id');

  const existingTxIds = new Set(existingEnergyUsages.map((e) => e.tx_id));

  const deepFilteredResults = results.filter(
    (result) => result.txID && !existingTxIds.has(result.txID),
  );

  console.log(
    `[processEnergyUsage] 过滤后未记录的能量合约调用数量: ${deepFilteredResults.length}`,
  );

  if (deepFilteredResults.length === 0) {
    console.log(`[processEnergyUsage] record.id=${rental.id} 未使用能量, 跳过`);
    return 0;
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

    if (energy <= 67000) {
      pens = 1; // 约 65k
    } else if (energy >= 80000) {
      pens = 2; // 约 135k
    }

    console.log(
      `[processEnergyUsage] 记录能量使用: txID=${result.txID}, energy=${energy}, bandwidth=${bandwidth}, pens=${pens}`,
    );

    const temp = await EnergyUsage.create({
      tx_id: result.txID,
      bot: rental.bot,
      botUser: rental.botUser,
      proxy: rental.proxy,
      rental: rental._id,
      type: 'rental',
      address: rental.from_address,
      energy,
      bandwidth,
      pens,
      amount: result.data.amount,
      to_address: result.data.to,
      transactionAt: new Date(result.timestamp),
    });

    energyUsages.push(temp);
  }

  console.log(
    `[processEnergyUsage] 能量使用记录完成, 新增记录数: ${energyUsages.length}`,
  );

  const totalPens = energyUsages.reduce(
    (sum, usage) => sum + (usage.pens || 0),
    0,
  );

  console.log(`[processEnergyUsage] 统计总笔数: ${totalPens}`);

  return totalPens;
}

export async function checkAutoUnRentals() {
  debug('checkAutoUnRentals');

  const currentDate = new Date();

  try {
    console.log('[checkAutoUnRentals] 开始检查所有待处理的能量归还订单...');

    // 查询所有已完成的闪租订单,不论到期与否
    const rentals = await Rental.find({
      status: 'completed',
    });

    console.log(
      `[checkAutoUnRentals] 查询到 ${rentals.length} 个完成发送能量的闪租记录`,
    );

    for (const rental of rentals) {
      try {
        let txid;

        // 如果订单已到期
        if (rental.endAt <= currentDate) {
          console.log(
            `[checkAutoUnRentals] 订单已到期,开始回收能量,订单ID：${rental._id}`,
          );
          txid = await unRentEnergy(rental);
          console.log(`[checkAutoUnRentals] 能量回收成功,txid=${txid}`);
        }
        // 如果订单尚未到期,根据使用情况决定是否回收能量
        else {
          console.log(
            `[checkAutoUnRentals] 订单未到期,开始检查能量使用情况,订单ID：${rental._id}`,
          );
          const totalPens = await processEnergyUsage(rental);

          if (totalPens > 0) {
            rental.used_times += totalPens;

            if (rental.used_times >= rental.separation) {
              txid = await unRentEnergy(rental);
              console.log(`[checkAutoUnRentals] 能量回收成功,txid=${txid}`);
            }
          }
        }
      } catch (sendErr) {
        console.error(`[checkAutoUnRentals] 能量回收失败:`, sendErr);
        continue;
      }
    }

    console.log('[checkAutoUnRentals] 待处理能量回收成功处理完成');
  } catch (error) {
    console.error('[checkAutoUnRentals] 处理能量闪租时出错:', error);
  }
}
