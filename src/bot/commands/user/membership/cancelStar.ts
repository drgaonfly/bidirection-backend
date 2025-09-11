import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import TgStar from '../../../../models/star';
import createDebug from 'debug';

const debug = createDebug('bot:cancelStar');
const cancelStarCommand = new Composer<MyContext>();

// 处理取消星星订单按钮点击
cancelStarCommand.callbackQuery(/^cancel_stars_order_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('订单已取消');
  const orderNumber = ctx.match[1];

  try {
    const order = await TgStar.findOne({ id: orderNumber });
    if (order) {
      order.status = 'cancelled';
      await order.save();
      await ctx.editMessageText('订单已取消');
      debug('星星订单已取消:', orderNumber);
    }
  } catch (error) {
    debug('取消星星订单时出错:', error);
    await ctx.reply('取消订单时出现错误，请联系客服');
  }
});

export default cancelStarCommand;
