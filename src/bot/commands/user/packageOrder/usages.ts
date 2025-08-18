import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import PackageOrder from '../../../../models/packageOrder';
import PackageUsageRecord from '../../../../models/packageUsageRecord';
import createDebug from 'debug';

const debug = createDebug('bot:record');

const usageCallack = new Composer<MyContext>();

// 发送我的套餐订单记录 (仅展示 InlineKeyboard)
usageCallack.callbackQuery(/^package_usages_(.+)$/, async (ctx) => {
  await ctx.conversation.exitAll();

  const orderId = ctx.match[1];
  debug('查询使用记录，orderId:', orderId);

  try {
    // 查找订单
    // 先用 id 字段查找，避免 ObjectId 转换错误
    const order = await PackageOrder.findOne({ id: orderId });
    if (!order) {
      await ctx.reply('⚠️ 未找到该套餐订单。');
      return;
    }

    // 查找使用记录
    const usageRecords = await PackageUsageRecord.find({
      packageOrder: order._id,
    }).sort({ usedAt: -1 });

    if (!usageRecords || usageRecords.length === 0) {
      await ctx.reply('ℹ️ 该订单还没有任何使用记录。');
      return;
    }

    // 格式化显示
    const msg = [
      usageRecords
        .map((rec, idx) => {
          return [
            `#${idx + 1}`,
            `🏠 地址: <code>${rec.address}</code>`,
            `📅 时间: ${rec.usedAt.toLocaleString()}`,
            `👤 类型: ${rec.type === 'myself' ? '自己用' : '他人用'}`,
            `✅ 状态: ${rec.status}`,
            `✏️ 使用笔数: ${rec.usedTimes}`,
            `📌 类型: ${rec.type}`,
            rec.notes ? `📝 备注: ${rec.notes}` : null,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n'),
    ].join('\n');

    await ctx.reply(
      `📖 套餐订单(${orderId} / ${order?.name}) 使用记录 \n\n${msg}`,
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    debug('查询使用记录失败', err);
    await ctx.reply('❗ 查询使用记录失败，请稍后再试。');
  }
});

export default usageCallack;
