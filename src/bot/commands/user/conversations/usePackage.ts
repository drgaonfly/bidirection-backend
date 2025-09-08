import PackageOrder from '../../../../models/packageOrder';
import PackageUsageRecord from '../../../../models/packageUsageRecord';
import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import { IBot } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import { genericSendEnergy } from '../../../../utils/fetchTransactions';
import { isValidTronAddress } from '../../../../utils/TronAddressTest';
import { awardUserPoints, awardProxyPoints } from '../../../../utils/addPoints';
import createDebug from 'debug';

const debug = createDebug('bot:package:use');

const usePackageCallback = new Composer<MyContext>();
const TIMEOUT = 5 * 60 * 1000; // 5 分钟
const cancelKeyboard = new InlineKeyboard().text('❌ 取消', 'close');

async function usePackageConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  {
    bot,
    botUser,
    orderId,
    type,
  }: {
    bot: IBot;
    botUser: IBotUser;
    orderId: string;
    type: 'myself' | 'other';
  },
) {
  const order = await PackageOrder.findOne({ id: orderId });
  if (!order) {
    await ctx.reply('❌ 套餐订单不存在');
    return;
  }

  // 1️⃣ 输入地址
  await ctx.reply(`请输入使用的地址：\n⏳ 此操作将在 5 分钟后过期`, {
    reply_markup: cancelKeyboard,
  });

  const addressResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    { maxMilliseconds: TIMEOUT },
  );

  if (addressResult.callbackQuery?.data === 'close') {
    await ctx.reply('已取消使用套餐');
    return;
  }

  const address = addressResult.message?.text;
  if (!address || !isValidTronAddress(address)) {
    debug('Invalid address format received:', address);
    await ctx.reply('❌ 请输入有效的Tron地址格式\n', {
      reply_markup: cancelKeyboard,
    });
    return await usePackageConversation(conversation, ctx, {
      bot,
      botUser,
      orderId,
      type,
    });
  }

  // 检查该地址是否已绑定过该套餐
  const existingRecord = await PackageUsageRecord.findOne({
    packageOrder: order._id,
    address: address,
    status: 'success',
    type: 'myself',
  });

  if (existingRecord && type !== 'other') {
    await ctx.reply('❌ 该地址已绑定过此套餐，请勿重复绑定');
    return await usePackageConversation(conversation, ctx, {
      bot,
      botUser,
      orderId,
      type,
    });
  }

  // 2️⃣ 确定使用笔数
  let usedTimes = 0;
  if (type === 'myself') {
    usedTimes = 2;
  } else {
    const timesKeyboard = new InlineKeyboard()
      .text('1 笔', 'use_times_1')
      .text('2 笔', 'use_times_2')
      .row()
      .text('❌ 取消', 'close');

    await ctx.reply(`请选择使用笔数：`, { reply_markup: timesKeyboard });

    const timesResult = await conversation.waitFor(['callback_query:data'], {
      maxMilliseconds: TIMEOUT,
    });

    if (timesResult.callbackQuery?.data === 'close') {
      await ctx.reply('已取消使用套餐');
      return;
    }

    await ctx.api.answerCallbackQuery(timesResult.callbackQuery.id);

    if (timesResult.callbackQuery?.data === 'use_times_1') usedTimes = 1;
    else if (timesResult.callbackQuery?.data === 'use_times_2') usedTimes = 2;

    if (!usedTimes || usedTimes > order.current_times) {
      await ctx.reply(
        `❌ 使用笔数不合法，必须在 1~${order.current_times} 之间`,
      );
      return await usePackageConversation(conversation, ctx, {
        bot,
        botUser,
        orderId,
        type,
      });
    }
  }

  const admin = await getAdminUser();

  // 3️⃣ 尝试发送能量
  const energy_per_times = admin.energy_per_times;
  const totalEnergy = energy_per_times * usedTimes;

  // 4️⃣ 创建使用记录
  const packageUsageRecord = await PackageUsageRecord.create({
    id: `${Date.now()}`,
    packageOrder: order._id,
    bot: bot._id,
    botUser: botUser._id,
    proxy: bot.user,
    address,
    status: 'pending',
    usedTimes,
    usedAt: new Date(),
    type,
    record_value: usedTimes,
    today_used_times: 0,
  });

  let txId = '';
  try {
    txId = await genericSendEnergy(
      address,
      totalEnergy,
      packageUsageRecord,
      usedTimes,
      type,
    );

    // 给买单的用户2个积分
    await awardUserPoints(
      packageUsageRecord.bot,
      packageUsageRecord.botUser,
      usedTimes,
      order,
    );

    // 给代理们 2 个 积分
    await awardProxyPoints(packageUsageRecord.bot, usedTimes, order);

    // await ctx.reply('地址绑定该套餐成功', {
    //   parse_mode: 'HTML',
    // });
  } catch (error) {
    console.error('能量发送失败:', error);

    await ctx.reply(['❌ 能量发送失败，请稍后重试', `${error}`].join('\n'), {
      parse_mode: 'HTML',
    });
    return;
  }

  // 扣减套餐剩余笔数
  order.current_times -= usedTimes;
  await order.save();

  // 6️⃣ 回复用户
  const message = [
    '✅ 套餐使用记录创建成功！',
    '',
    type === 'myself' ? '' : '🕐请在1小时内使用能量，1小时未使用，将回收能量',
    '',
    `🆔 订单ID: <code>${order.id}</code>`,
    '',
    `🏦 使用地址: <code>${address}</code>`,
    '',
    `✏️ 使用笔数: <b>${usedTimes}</b>`,
    '',
    `🛠️ 使用类型: <b>${type === 'myself' ? '自己' : '他人'}</b>`,
    '',
    `⚡ 发送能量: <b>${totalEnergy} sun</b>`,
    '',
    `🆔 交易ID: <code>${txId}</code>`,
  ].join('\n');

  await ctx.reply(message, { parse_mode: 'HTML' });
}

usePackageCallback.use(createConversation(usePackageConversation));

usePackageCallback.callbackQuery(
  /^packageOrder_use_(.+)_(myself|other)$/,
  async (ctx) => {
    await ctx.conversation.exitAll();

    debug('usePackageCallback callbackQuery');

    const match = ctx.callbackQuery.data.match(
      /^packageOrder_use_(.+)_(myself|other)$/,
    );

    if (!match) return;

    const orderId = match[1];
    const type = match[2] as 'myself' | 'other';

    await ctx.conversation.exitAll();
    await ctx.conversation.enter('usePackageConversation', {
      bot: ctx.currentBot,
      botUser: ctx.currentBotUser,
      orderId,
      type,
    });
  },
);

export default usePackageCallback;
