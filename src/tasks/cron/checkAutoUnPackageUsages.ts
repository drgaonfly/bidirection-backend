import EnergySend from '../../models/energySend';
import { genericRecycleEnergy } from '../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有已完成且到期的租赁订单，自动归还能量
 */
export async function checkAutoUnPackageUsages() {
  debug('checkAutoUnPackageUsages');

  const currentDate = new Date();

  try {
    console.log(
      '[checkAutoUnPackageUsages] 开始检查所有待处理的能量归还订单...',
    );

    // 查询所有已完成的能量发送记录
    const sends = await EnergySend.find({
      packageUsageRecord: { $ne: null },
      status: 'success',
    });

    console.log(
      `[checkAutoUnPackageUsages] 查询到 ${sends.length} 个成功的能量发送记录`,
    );

    for (const send of sends) {
      // 判断是否达到limit_day天数
      const { limit_day, createdAt } = send;

      // 计算已过去的天数
      const createdDate = new Date(createdAt);
      const diffTime = currentDate.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < limit_day) {
        // 未到期，跳过
        continue;
      }

      try {
        const txid = await genericRecycleEnergy(send);

        console.log(`[checkAutoUnPackageUsages] 能量回收成功, txid=${txid}`);
      } catch (sendErr) {
        console.error(`[checkAutoUnPackageUsages] 能量回收失败:`, sendErr);

        continue;
      }
    }

    console.log('[checkAutoUnPackageUsages] 待处理能量回收成功处理完成');
  } catch (error) {
    console.error('[checkAutoUnPackageUsages] 处理能量租赁时出错:', error);
  }
}
