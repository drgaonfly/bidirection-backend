import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import Exchange from '../../../../models/exchange';
import { formatBeijingDate } from '../../../../utils/formatBeijingDate';

const exchangeCancelComposer = new Composer<MyContext>();

const debug = createDebug('bot:exchange:cancel');

// 取消订单回调处理
exchangeCancelComposer.callbackQuery(/^cancel_exchange_(\d+)$/, async (ctx) => {
  debug('cancel_exchange callback triggered');

  const [, , exchangeId] = ctx.callbackQuery.data.split('_');

  console.log(exchangeId);

  try {
    // 查找订单
    const exchange = await Exchange.findOne({
      id: exchangeId,
    });

    if (!exchange) {
      await ctx.answerCallbackQuery('❌ 订单不存在');
      return;
    }

    // 检查订单状态
    if (exchange.status !== 'pending') {
      await ctx.answerCallbackQuery('❌ 订单已经取消');
      return;
    }

    // 更新订单状态为已取消
    await Exchange.findByIdAndUpdate(exchange._id, {
      status: 'cancelled',
    });

    await ctx.answerCallbackQuery('✅ 订单已取消');

    // 更新消息显示订单已取消
    const updatedMessage = [
      `<b>❌ 订单已取消</b>`,
      `\n`,
      `订单号：${exchange.id}`,
      `状态：已取消`,
      `取消时间：${formatBeijingDate(new Date())}`,
    ].join('\n');

    await ctx.editMessageText(updatedMessage, {
      parse_mode: 'HTML',
    });
  } catch (error) {
    debug('Cancel exchange error:', error);
    await ctx.answerCallbackQuery('❌ 取消订单失败，请稍后重试');
  }
});

export default exchangeCancelComposer;
