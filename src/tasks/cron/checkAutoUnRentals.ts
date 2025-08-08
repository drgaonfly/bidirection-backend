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

  try {
    console.log('[checkAutoUnRentals] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 recharge）
    const delegatings = await UnRental.find({
      status: 'delegated',
    });

    console.log(
      `[checkAutoUnRentals] 查询到 ${delegatings.length} 个租赁中的记录`,
    );

    for (const delegating of delegatings) {
      const rental = await Rental.findOne({
        rental: delegating._id,
      });

      try {
        const txid = await unRentEnergy(
          delegating,
          rental.from_address,
          rental.to_address,
          rental.amount,
          rental.crypto_type,
        );
        console.log(`[checkAutoUnRentals] 能量租赁成功, txid=${txid}`);
      } catch (sendErr) {
        console.error(`[checkAutoUnRentals] 能量租赁成功失败:`, sendErr);

        continue;
      }
    }

    console.log('[checkAutoUnRentals] 待处理能量租赁处理完成');
  } catch (error) {
    console.error('[checkAutoUnRentals] 处理能量租赁时出错:', error);
  }
}
