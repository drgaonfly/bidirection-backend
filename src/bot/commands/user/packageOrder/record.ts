import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder, { IPackageOrder } from '../../../../models/packageOrder';
import { formatBeijingDate } from '../../../../utils/formatBeijingDate';
import createDebug from 'debug';

const debug = createDebug('bot:record');

const recordCallback = new Composer<MyContext>();

// 发送我的套餐订单记录
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

    // 格式化每条订单
    const messages = orders
      .map((order) => {
        return [
          `🆔 订单ID: <code>${order.id}</code>`,
          `✏️ 笔数: <b>${order.times}</b>`,
          `⚡ 能量: <b>${order.energy} sun</b>`,
          `💵 金额: <b>${order.price} ${order.paymentType.toUpperCase()}</b>`,
          `⏰ 购买时间: <b>${formatBeijingDate(order.createdAt)}</b>`,
          '\n',
        ].join('\n');
      })
      .join('\n');

    // 由于消息可能过长，可以分批发送或者直接发送全部
    await ctx.reply(messages, { parse_mode: 'HTML' });
  } catch (err) {
    debug('查询订单失败', err);
    await ctx.reply('❗ 查询订单失败，请稍后再试。');
  }
}

// 注册命令
recordCallback.callbackQuery('my_package_order', async (ctx) => {
  await sendMyPackageOrders(ctx);
});

export default recordCallback;
