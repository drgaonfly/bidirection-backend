import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Trash from '../../../../models/trash';
import PackageOrder from '../../../../models/packageOrder';
import PackageUsageRecord from '../../../../models/packageUsageRecord';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import { genericRecycleEnergyByAmount } from '../../../../utils/fetchTransactions';
import createDebug from 'debug';

const debug = createDebug('bot:record');

const removeCallback = new Composer<MyContext>();

// 发送自用地址并允许用户选择删除
removeCallback.callbackQuery(/^packageOrder_remove_(.+)$/, async (ctx) => {
  const orderId = ctx.match[1];
  debug('查询订单自用地址，orderId:', orderId);

  try {
    // 查找订单
    const order = await PackageOrder.findOne({ id: orderId });
    if (!order) {
      await ctx.reply('⚠️ 未找到该套餐订单。');
      return;
    }

    // 查找自用地址（如果有的话）
    const usageRecords = await PackageUsageRecord.find({
      packageOrder: order._id,
      type: 'myself', // 只查找自用地址
      status: 'success',
    }).sort({ usedAt: -1 });

    if (!usageRecords || usageRecords.length === 0) {
      await ctx.reply('⚠️ 没有找到绑定的自用地址。');
      return;
    }

    // 构建 InlineKeyboard
    const keyboard = usageRecords.map((record, idx) => ({
      text: `#${idx + 1} 地址: ${record.address}`,
      callback_data: `remove_address_${record._id}`, // 使用 record._id 来唯一标识每个地址
    }));

    await ctx.reply(`请选择要删除的自用地址：`, {
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    });
  } catch (err) {
    debug('查询自用地址失败', err);
    await ctx.reply('❗ 查询自用地址失败，请稍后再试。');
  }
});

// 处理用户点击删除地址
removeCallback.callbackQuery(/^remove_address_(.+)$/, async (ctx) => {
  const recordId = ctx.match[1];
  debug('删除自用地址，usageRecordId:', recordId);

  const adminUser = await getAdminUser();

  const energy_per_times = adminUser.energy_per_times;

  try {
    // 查找自用地址记录
    const record = await PackageUsageRecord.findById(recordId);
    if (!record) {
      await ctx.reply('⚠️ 找不到该自用地址记录。');
      return;
    }

    // 先回收能量
    await genericRecycleEnergyByAmount(
      energy_per_times * record.usedTimes,
      record.address,
      record,
      2,
      'myself',
    );

    // 后删除绑定的自用地址
    // 可选：将删除的地址记录添加到 Trash（删除日志）
    await Trash.insertMany(record);

    await PackageUsageRecord.findByIdAndDelete(recordId);

    await ctx.reply('✅ 成功删除该自用地址。');
  } catch (err) {
    debug('删除自用地址失败', err);
    await ctx.reply('❗ 删除自用地址失败，请稍后再试。');
  }
});

export default removeCallback;
