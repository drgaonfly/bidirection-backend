import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder, { IPackageOrder } from '../../../../models/packageOrder';
import createDebug from 'debug';

const debug = createDebug('bot:record');

const displayCallback = new Composer<MyContext>();

// 发送我的套餐订单记录 (仅展示 InlineKeyboard)
export async function sendMyPackageOrders(ctx: MyContext) {
  try {
    // 查询当前用户的订单
    const orders: IPackageOrder[] = await PackageOrder.find({
      botUser: ctx.currentBotUser._id,
      bot: ctx.currentBot._id,
      status: 'active',
    })
      .sort({ createdAt: -1 }) // 最新订单在前
      .populate('bot', 'name'); // 获取机器人名称

    if (!orders || orders.length === 0) {
      await ctx.reply('ℹ️ 您还没有任何套餐订单记录。');
      return;
    }

    // 构建 inline keyboard
    const keyboard = new InlineKeyboard();
    orders.forEach((order) => {
      keyboard
        .text(
          `${order.energy} sun / ${order.times} 笔 / ${
            order.validityDays
          } 天 / ${order.price} ${order.paymentType.toUpperCase()}`,
          `packageOrder_record_${order.id}`,
        )
        .row();
    });

    await ctx.reply('📦 请选择要查看的套餐订单：', {
      reply_markup: keyboard,
    });
  } catch (err) {
    debug('查询订单失败', err);
    await ctx.reply('❗ 查询订单失败，请稍后再试。');
  }
}

// 注册命令
displayCallback.callbackQuery('my_packageOrder', async (ctx) => {
  await ctx.conversation.exitAll();

  await sendMyPackageOrders(ctx);
});

displayCallback.callbackQuery('packageOrder_back', async (ctx) => {
  await ctx.conversation.exitAll();

  await ctx.deleteMessage();

  await sendMyPackageOrders(ctx);
});

export default displayCallback;
