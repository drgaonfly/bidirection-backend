import Rental from '../../models/rental';
import { unRentEnergy } from '../../utils/fetchTransactions';
import UnRental from '../../models/unrental';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有 pending 的充值订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkAutoUnRentals() {
  debug('checkAutoUnRentals');

  const currentDate = new Date();

  try {
    console.log('[checkAutoUnRentals] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 recharge）
    const rentals = await Rental.find({
      status: 'completed',
    });

    console.log(`[checkAutoUnRentals] 查询到 ${rentals.length} 个租赁中的记录`);

    for (const rental of rentals) {
      // 当前时间 减去 rental.endAt(Date) ，是否大于rent.limit_hour(number)

      const diff = currentDate.getTime() - rental.endAt.getTime();

      if (diff < rental.limit_hour * 60 * 60 * 1000) {
        console.log(`[checkAutoUnRentals] ${rental._id} 租赁时间未超过限制`);

        continue;
      }

      try {
        const result = await unRentEnergy(rental.from_address, rental.amount);

        await UnRental.create({
          proxy: rental.proxy,
          bot: rental.bot,
          amount: rental.amount,
          separation: rental.separation,
          limit_hour: rental.limit_hour,
          hash: result.txid,
          status: 'delegated',
        });

        console.log(`[checkAutoUnRentals] 能量租赁成功, txid=${result.txid}`);
      } catch (sendErr) {
        console.error(`[checkAutoUnRentals] 能量租赁成功失败:`, sendErr);

        await UnRental.create({
          proxy: rental.proxy,
          bot: rental.bot,
          amount: rental.amount,
          separation: rental.separation,
          limit_hour: rental.limit_hour,
          status: 'failed',
        });

        continue;
      }
    }

    console.log('[checkAutoUnRentals] 待处理能量租赁处理完成');
  } catch (error) {
    console.error('[checkAutoUnRentals] 处理能量租赁时出错:', error);
  }
}
