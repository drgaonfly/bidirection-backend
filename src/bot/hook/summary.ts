import Transaction from '../../models/transaction';
import { IBot } from '../../models/bot';

/**
 * 获取交易数据的Hook
 * @param bot 当前机器人
 * @returns 返回交易次数和交易列表
 */
export const useTransactionData = async (bot: IBot) => {
  // 获取所有交易数据
  const [depositTimes, deposits, withdrawTimes, withdraws] = await Promise.all([
    Transaction.countDocuments({ bot: bot._id, type: 'deposit' }),
    Transaction.find({ bot: bot._id, type: 'deposit' }).sort({ createdAt: 1 }),
    Transaction.countDocuments({ bot: bot._id, type: 'withdraw' }),
    Transaction.find({ bot: bot._id, type: 'withdraw' }).sort({ createdAt: 1 }),
  ]);

  return {
    depositTimes,
    deposits,
    withdrawTimes,
    withdraws,
  };
};
