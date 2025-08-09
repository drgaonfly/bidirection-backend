import Rental from '../../models/rental';
import { unRentEnergy } from '../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkAutoUnRentals() {
  debug('checkAutoUnRentals');

  const currentDate = new Date();

  try {
    console.log('[checkAutoUnRentals] 开始检查所有待处理的能量归还订单...');

    // 查询所有已完成且到期的租赁订单
    const rentals = await Rental.find({
      status: 'completed',
      endAt: { $exists: true, $lte: currentDate },
      $expr: {
        $lte: [
          { $add: ['$endAt', { $multiply: ['$limit_hour', 60 * 60 * 1000] }] },
          currentDate,
        ],
      },
    });

    console.log(
      `[checkAutoUnRentals] 查询到 ${rentals.length} 个已到期的租赁记录`,
    );

    for (const rental of rentals) {
      try {
        const txid = await unRentEnergy(rental);

        console.log(`[checkAutoUnRentals] 能量回收成功, txid=${txid}`);
      } catch (sendErr) {
        console.error(`[checkAutoUnRentals] 能量回收失败:`, sendErr);

        continue;
      }
    }

    console.log('[checkAutoUnRentals] 待处理能量回收成功处理完成');
  } catch (error) {
    console.error('[checkAutoUnRentals] 处理能量租赁时出错:', error);
  }
}
