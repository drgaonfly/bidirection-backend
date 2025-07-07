import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import { handleRechargeRequest } from '../recharge/helper';

const debug = createDebug('bot:custom-recharge');
const customRechargeCallback = new Composer<MyContext>();
// 自定义充值超时时间
// 5分钟
const TIMEOUT = 5 * 60 * 1000;

// 使用 conversations 中间件
// const conversationsMiddleware = conversations();
// customRechargeCallback.use(conversationsMiddleware);

const cancelKeyboard = new InlineKeyboard().text(
  '❌ 取消',
  'cancel_custom_recharge',
);

// 定义自定义充值对话
async function customRechargeConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { crypto_type }: { crypto_type: string },
) {
  debug('等待用户输入金额');
  debug('ctx', ctx);

  const conversationResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  const { message } = conversationResult;

  // 检查是否输入了取消
  if (message?.text === '取消') {
    await ctx.reply('已取消充值');
    return;
  }

  if (conversationResult.callbackQuery) {
    const { data } = conversationResult.callbackQuery;
    if (data === 'cancel_custom_recharge') {
      await ctx.reply('已取消充值');
      return;
    }
  }

  // 检查格式
  if (!/^\d+(\.\d{1,2})?$/.test(message?.text || '')) {
    await ctx.reply('❗ 请输入正确的金额格式，例如：10.00\n', {
      reply_markup: cancelKeyboard,
    });
    return await customRechargeConversation(conversation, ctx, { crypto_type });
  }

  const amount = parseFloat(message.text);
  debug('充值金额输入:', amount);

  // 验证金额范围
  if (amount < 1) {
    await ctx.reply('❗ 最低充值金额为 1 u，请重新输入。');
    return await customRechargeConversation(conversation, ctx, { crypto_type });
  }

  // 发起下一步处理逻辑，如生成订单等
  await ctx.reply(
    `✅ 已收到您要充值的金额：${amount} ${crypto_type}，正在处理...`,
  );

  const session = await conversation.external((ctx) => ctx.session);
  debug('handleRechargeRequest-session', session);

  const success = await handleRechargeRequest(ctx, amount, crypto_type);

  if (!success) {
    debug('处理特定金额充值失败');
    await ctx.reply('处理特定金额充值失败');
  }
}

// 使用 createConversation 创建对话处理器
customRechargeCallback.use(createConversation(customRechargeConversation));

// 自定义充值按钮点击
customRechargeCallback.callbackQuery(/^charge_custom_(\w+)$/, async (ctx) => {
  debug('charge_custom clicked');
  await ctx.conversation.exitAll();

  const match = ctx.callbackQuery.data.match(/^charge_custom_(\w+)$/);

  const crypto_type = match[1].trim();

  await ctx.reply(
    [
      `请输入您想要充值的金额（单位：${crypto_type.toUpperCase()}) :`,
      '',
      '⚠️ 确保输入格式正确，例如：10.00',
      '',
      '最低充值金额为 1。',
      '',
      '⏳ 此操作将在 5 分钟后过期。',
      '',
    ].join('\n'),
    { reply_markup: cancelKeyboard },
  );

  await ctx.conversation.enter('customRechargeConversation', {
    crypto_type,
  });

  await ctx.answerCallbackQuery();
});

// 取消充值处理
customRechargeCallback.callbackQuery('cancel_custom_recharge', async (ctx) => {
  debug('custom_recharge_cancel clicked');

  await ctx.conversation.exitAll();

  await ctx.deleteMessage();
  await ctx.answerCallbackQuery('已取消充值');
});

export default customRechargeCallback;
