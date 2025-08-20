import PackageUsageRecord from '../../models/packageUsageRecord';
import EnergyUsage from '../../models/energyUsage';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import minConsumption from '../../models/minConsumption';
import PackageOrder from '../../models/packageOrder';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkMinConsumption() {
  debug('checkMinConsumption');

  const adminUser = await getAdminUser();

  // 查询今天0点到明天0点的能量使用记录
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    console.log('[checkMinConsumption] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const purs = await PackageUsageRecord.find({
      status: 'success',
    });

    console.log(
      `[checkMinConsumption] 查询到 ${purs.length} 个符合条件的套餐使用记录`,
    );

    for (const pur of purs) {
      const packageOrder = await PackageOrder.findById(pur.packageOrder);

      if (packageOrder.current_times === 0) {
        console.log(
          `[checkMinConsumption] packageUsageRecord: [${pur.id}] 所归属的套餐订单已无可用笔数，跳过`,
        );

        continue;
      }

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

      if (used_times === 0) {
        //used_times === 0, 说明，给自己或给他人充的能量，一点没用，按低消回收

        try {
          await minConsumption.create({
            bot: pur.bot,
            botUser: pur.botUser,
            proxy: pur.proxy,
            packageUsageRecord: pur._id,
            pens: adminUser.recycle_min,
          });

          await PackageOrder.findByIdAndUpdate(pur.packageOrder, {
            $inc: {
              current_times: -adminUser.recycle_min,
            },
          });

          console.log(
            `[checkMinConsumption] packageUsageRecord : ${pur.id} 扣低消成`,
          );
        } catch (error) {
          console.log(`[checkMinConsumption] 扣低消失败, ${error}`);
        }
      }
    }

    console.log('[checkMinConsumption] 处理扣低消成功');
  } catch (error) {
    console.error('[checkMinConsumption] 处理扣低消时出错:', error);
  }
}
