import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Premium from '../../../../models/premium';
import createDebug from 'debug';

const debug = createDebug('bot:cancelPremium');
const cancelPremiumCommand = new Composer<MyContext>();

// 处理取消premium订单按钮点击
cancelPremiumCommand.callbackQuery(
  /^cancel_premium_order_(.+)$/,
  async (ctx) => {
    await ctx.answerCallbackQuery('订单已取消');
    const orderId = ctx.match[1];

    try {
      const premium = await Premium.findOne({ id: orderId });
      if (premium) {
        await Premium.deleteOne({ id: orderId });
        await ctx.editMessageText('订单已取消');
        debug('Premium订单已取消:', orderId);
      }
    } catch (error) {
      debug('取消Premium订单时出错:', error);
      await ctx.reply('取消订单时出现错误，请联系客服');
    }
  },
);

export default cancelPremiumCommand;
