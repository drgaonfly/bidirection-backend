import PackageUsageRecord from '../../models/packageUsageRecord';
import EnergyUsage from '../../models/energyUsage';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { genericRecycleEnergyByAmount } from '../../utils/fetchTransactions';
import UnRental from '../../models/unrental';
import { decrypt } from '../../services/encrypt';
import { TronWeb } from 'tronweb';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function recycleEnergy() {
  debug('recycleEnergy');

  const adminUser = await getAdminUser();

  const decryptedPrivateKey = decrypt(adminUser.energy_privateKey);

  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址

  try {
    console.log('[recycleEnergy] 开始检查所有待处理的套餐使用记录...');

    // 查询所有已完成的套餐使用记录
    const purs = await PackageUsageRecord.find({
      status: 'success',
      isRecycled: false,
    });

    console.log(
      `[recycleEnergy] 查询到 ${purs.length} 个符合条件的套餐使用记录`,
    );

    for (const pur of purs) {
      const energyUsages = await EnergyUsage.find({
        packageUsageRecord: pur._id,
        isRecycled: false,
      });

      if (energyUsages.length === 0) {
        console.log(
          `[recycleEnergy]: packageUsageRecord: ${pur.id} 没有能量使用记录，跳过]`,
        );
        continue;
      }

      const used_times = energyUsages.reduce(
        (sum, eu) => sum + (eu.pens || 0),
        0,
      );

      const used_energy = used_times * adminUser.energy_per_times;

      const ur = await UnRental.findOneAndUpdate(
        {
          bot: pur.bot,
          botUser: pur.botUser,
          proxy: pur.proxy,
          packageUsageRecord: pur._id,
        },
        {
          $set: {
            energySendAddress: fromAddress,
            from: adminUser.energy_address,
            to: pur.address,
            separation: used_times,
            amount: used_energy,
          },
        },
        { new: true, upsert: true },
      );

      let tx_id = '';

      if (used_times >= adminUser.recycle_min) {
        try {
          tx_id = await genericRecycleEnergyByAmount(used_energy, pur.address);

          ur.hash = tx_id;
          ur.status = 'success';

          await ur.save();

          await EnergyUsage.updateMany(
            { _id: { $in: energyUsages.map((eu) => eu._id) } },
            { $set: { isRecycled: true } },
          );

          pur.isRecycled = true;
          await pur.save();

          console.log(
            `[recycleEnergy] packageUsageRecord : ${pur.id} 回收能量成功, tx_id=${tx_id}`,
          );
        } catch (error) {
          ur.status = 'failed';

          await ur.save();

          console.log(`[recycleEnergy] 回收能量失败, ${error}`);
        }
      }
    }

    console.log('[recycleEnergy] 处理回收能量成功');
  } catch (error) {
    console.error('[recycleEnergy] 处理回收能量时出错:', error);
  }
}
