import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import { IBot } from '../../../../models/bot';
import { IBotUser } from '../../../../models/botUser';
import PackageOrder from '../../../../models/packageOrder';
import PackageUsageRecord from '../../../../models/packageUsageRecord';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import createDebug from 'debug';

const debug = createDebug('bot:package:use');

const usePackageCallback = new Composer<MyContext>();
const TIMEOUT = 5 * 60 * 1000; // 5 分钟

const cancelKeyboard = new InlineKeyboard().text('❌ 取消', 'close');

// 对话：使用套餐
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
  if (!address) {
    await ctx.reply('❌ 地址无效，请重新操作');
    return await usePackageConversation(conversation, ctx, {
      bot,
      botUser,
      orderId,
      type,
    });
  }

  // 2️⃣ 选择使用笔数
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

  let usedTimes = 0;
  if (timesResult.callbackQuery?.data === 'use_times_1') usedTimes = 1;
  else if (timesResult.callbackQuery?.data === 'use_times_2') usedTimes = 2;

  if (!usedTimes || usedTimes > order.times) {
    await ctx.reply(`❌ 使用笔数不合法，必须在 1~${order.times} 之间`);
    return await usePackageConversation(conversation, ctx, {
      bot,
      botUser,
      orderId,
      type,
    });
  }

  // 3️⃣ 创建使用记录
  await PackageUsageRecord.create({
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
  });

  // 扣减套餐剩余笔数
  order.times -= usedTimes;
  await order.save();

  const energy_per_times = (await getAdminUser()).energy_per_times;

  const message = [
    '✅ 套餐使用记录创建成功！',
    '',
    `🆔 订单ID: <code>${order.id}</code>`,
    '',
    `🏦 使用地址: <code>${address}</code>`,
    '',
    `✏️ 使用笔数: <b>${usedTimes}</b>`,
    '',
    `🛠️ 使用类型: <b>${type === 'myself' ? '自己' : '他人'}</b>`,
    '',
    `⚡ 预计发送能量: <b>${energy_per_times * usedTimes} sun</b>`,
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
