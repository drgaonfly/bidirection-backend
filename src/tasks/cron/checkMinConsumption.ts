import PackageUsageRecord from '../../models/packageUsageRecord';
import EnergyUsage from '../../models/energyUsage';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import minConsumption from '../../models/minConsumption';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkMinConsumption() {
  debug('checkMinConsumption');

  const adminUser = await getAdminUser();

  try {
    console.log('[checkMinConsumption] 开始检查所有待处理的能量归还订单...');

    // 查询所有已完成的套餐使用记录
    const purs = await PackageUsageRecord.find({
      status: 'success',
    });

    console.log(
      `[checkMinConsumption] 查询到 ${purs.length} 个符合条件的套餐使用记录`,
    );

    for (const pur of purs) {
      // 查询今天0点到明天0点的能量使用记录
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const energyUsages = await EnergyUsage.find({
        packageUsageRecord: pur._id,
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      });

      // 判断一下，能量使用记录的使用笔数有没有超过套餐订单的低消
      const used_times = energyUsages.reduce(
        (sum, eu) => sum + (eu.pens || 0),
        0,
      );

      let used_energy = 0;

      if (used_times >= adminUser.recycle_min) {
        //used_times >= packageOrder.minConsumption, 说明，我给自己或给他人充的能量，不仅都用了，还达到了或超过了低消

        let tx_id = '';

        used_energy = used_times * adminUser.energy_per_times;

        try {
          tx_id = await genericRecycleEnergyByAmount(used_energy, pur.address);

          await minConsumption.create({
            bot: pur.bot,
            botUser: pur.botUser,
            proxy: pur.proxy,
            packageUsageRecord: pur._id,
            energy: used_energy,
            pens: used_times,
            tx_id,
          });

          console.log(
            `[checkMinConsumption] packageUsageRecord : ${pur.id} 回收成功, ${tx_id}`,
          );
        } catch (error) {
          console.log(`[checkMinConsumption] 回收失败, ${error}`);
        }
      } else {
        // 如果用的笔数小于低消，就用低消

        let tx_id = '';

        used_energy = adminUser.recycle_min * adminUser.energy_per_times;

        try {
          tx_id = await genericRecycleEnergyByAmount(used_energy, pur.address);

          await minConsumption.create({
            bot: pur.bot,
            botUser: pur.botUser,
            proxy: pur.proxy,
            packageUsageRecord: pur._id,
            energy: used_energy,
            pens: used_times,
            tx_id,
          });

          console.log(
            `[checkMinConsumption] packageUsageRecord : ${pur.id} 回收成功, ${tx_id}`,
          );
        } catch (error) {
          console.log(`[checkMinConsumption] 回收失败, ${error}`);
        }
      }
    }

    console.log('[checkMinConsumption] 待处理能量回收成功处理完成');
  } catch (error) {
    console.error('[checkMinConsumption] 处理能量租赁时出错:', error);
  }
}
