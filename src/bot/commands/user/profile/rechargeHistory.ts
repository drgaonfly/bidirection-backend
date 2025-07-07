import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import Payment from '../../../../models/payment';
import { useOrderHistory } from '../../../../utils/useEjsMessage';

const rechargeHistoryCallback = new Composer<MyContext>();
const debug = createDebug('bot:recharge-history');

// 处理订单历史记录回调
rechargeHistoryCallback.callbackQuery('recharge_history', async (ctx) => {
  debug('订单历史记录回调被触发');

  // 查询用户的所有订单（Payment），限制5条
  const payments = await Payment.find({
    botUser: ctx.currentBotUser._id,
    bot: ctx.currentBot._id,
    status: 'paid',
    type: 'recharge',
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const renderOrderHistory = useOrderHistory();
  const message = await renderOrderHistory({
    orders: payments,
    t: ctx.t,
    type: 'recharge',
  });

  // 添加返回按钮
  await ctx.reply(message, {
    parse_mode: 'HTML',
  });

  await ctx.answerCallbackQuery();
});

// 辅助函数：获取订单状态的中文描述
// function getStatusText(status: string): string {
//   const statusMap: { [key: string]: string } = {
//     pending: '待支付',
//     paid: '已支付',
//     expired: '已过期',
//     cancelled: '已取消',
//   };

//   return statusMap[status] || status;
// }

export default rechargeHistoryCallback;
