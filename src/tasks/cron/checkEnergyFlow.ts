import PackageUsageRecord from '../../models/packageUsageRecord';
import {
  fetchEnergyContractCalls,
  genericSendEnergy,
} from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import EnergyUsage from '../../models/energyUsage';
import EnergySend from '../../models/energySend';
import PackageOrder from '../../models/packageOrder';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkEnergyFlow() {
  debug('checkEnergyFlow');

  const adminUser = await getAdminUser();

  const energyAddress = adminUser.energy_address; // B 地址，放能量

  try {
    console.log('[checkEnergyFlow] 开始检查所有待处理的能量归还订单...');

    // 查询所有已完成且到期的租赁订单
    const records = await PackageUsageRecord.find({
      status: 'success',
    });

    console.log(`[checkEnergyFlow] 查询到 ${records.length} 个套餐使用记录`);

    for (const record of records) {
      try {
        const results = await fetchEnergyContractCalls(record.address, 1);

        const packageOrder = await PackageOrder.findById(record.packageOrder);

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

          const eu = await EnergyUsage.findOneAndUpdate(
            {
              tx_id: result.txID,
            },
            {
              $set: {
                bot: record.bot,
                botUser: record.botUser,
                proxy: record.proxy,
                packageUsageRecord: record._id,
                address: record.address,
                energy,
                bandwidth,
                pens,
                amount: result.data.amount,
                to_address: result.data.to,
                transactionAt: new Date(result.timestamp),
              },
            },
            { new: true, upsert: true },
          );

          const es = await EnergySend.create({
            bot: record.bot,
            botUser: record.botUser,
            proxy: record.proxy,
            packageUsageRecord: record._id,
            from_address: energyAddress,
            to_address: record.address,
            energySendAddress: energyAddress,
            amount: energy,
            separation: pens,
            limit_day: packageOrder.validityDays,
            type: 'daily',
            status: 'pending',
          });

          try {
            tx_id = await genericSendEnergy(record.address, energy);

            es.tx_id = tx_id;
            es.status = 'success';
            await es.save();
          } catch (error) {
            es.status = 'failed';
            await es.save();
          }

          console.log(`[checkEnergyFlow] 能量使用记录成功`, eu);
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
