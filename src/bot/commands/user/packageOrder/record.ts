import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder from '../../../../models/packageOrder';
import { formatBeijingDate } from '../../../../utils/formatBeijingDate';
import createDebug from 'debug';

const debug = createDebug('bot:record');

const recordCallback = new Composer<MyContext>();

// 订单详情展示
recordCallback.callbackQuery(/^packageOrder_record_(.+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^packageOrder_record_(.+)$/);
  if (!match) {
    await ctx.answerCallbackQuery({ text: '订单ID无效', show_alert: true });
    return;
  }

  const orderId = match[1];
  debug('查看套餐订单详情: %s', orderId);

  const order = await PackageOrder.findOne({ id: orderId });
  if (!order) {
    await ctx.answerCallbackQuery({ text: '未找到订单', show_alert: true });
    return;
  }

  const details = [
    `🆔 订单ID: <code>${order.id}</code>`,
    `✏️ 笔数: <b>${order.times}</b>`,
    `⚡ 能量: <b>${order.energy}</b> sun`,
    `💵 金额: <b>${order.price} ${order.paymentType.toUpperCase()}</b>`,
    `🪙 最低消费: <b>${order.minConsumption} 笔</b>`,
    `⏰ 有效期: <b>${order.validityDays} 天</b>`,
    `⏳ 过期时间: <b>${formatBeijingDate(order.expiredAt)}</b>`,
  ].join('\n');

  const menus = new InlineKeyboard()
    .text('🛠️ 给他人使用套餐', `packageOrder_use_${orderId}_other`)
    .text('🛠️ 自己使用套餐', `packageOrder_use_${orderId}_myself`)
    .row()
    .text('🔙 返回菜单', 'packageOrder_back')
    .text('📖 使用记录', `package_usages_${orderId}`)
    .row()
    .text('❌ 关闭', 'close');

  await ctx.editMessageText(details, {
    parse_mode: 'HTML',
    reply_markup: menus,
  });

  await ctx.answerCallbackQuery();
});

export default recordCallback;
