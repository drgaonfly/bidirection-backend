import Premium from '../../../../models/premium';
import { MyContext } from '../../../types';
import { Composer, InlineKeyboard } from 'grammy';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { getUserByUsername } from '../operator/add';
import { findBotAndUser } from '../../../services/findBotAndUser';
import { IdGen } from '../../../../utils/idGen';
import { isValidTelegramFormat } from '../../../../utils/validateTelegramFormat';
import { IUser } from '../../../../models/user';
import createDebug from 'debug';
// 创建一个新的 Composer 实例
const premiumCallback = new Composer<MyContext>();

const debug = createDebug('bot:premium');

const TIMEOUT = 5 * 60 * 1000;

// 配置
const PREMIUM_CONFIG = {
  PRICES: { '3m': 15, '6m': 25, '1y': 45 },
  NAMES: { '3m': '3个月会员', '6m': '6个月会员', '1y': '1年会员' },
} as const;

async function handleBuyPremiumCommand(ctx: MyContext, duration: string) {
  const price = PREMIUM_CONFIG.PRICES[duration];
  const name = PREMIUM_CONFIG.NAMES[duration];

  const message = [
    '🎉 尊敬的用户您好！',
    '',
    `📌 您已选择订购 ${name} 会员服务`,
    `💰 套餐价格：${price}U`,
    '',
    '✨ 开通步骤：',
    '1️⃣ 请复制并发送您的Telegram账号信息，格式如下：',
    '📤 用户名：@test',
    '🔗 个人链接：https://t.me/test',
    '',
    '⚠️ 温馨提示：',
    '• 请确保发送的账号信息准确无误',
    '• 如有疑问请联系客服',
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().row().text('取消', 'close'),
  });
}

async function premiumConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { duration, proxy }: { duration: string; proxy: IUser },
) {
  debug('等待用户输入Telegram账号');

  const conversationResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    {
      maxMilliseconds: TIMEOUT,
    },
  );

  const { message } = conversationResult;

  // 检查是否取消
  if (message?.text === '取消') {
    await ctx.reply('已取消操作');
    return;
  }

  if (conversationResult.callbackQuery) {
    const { data } = conversationResult.callbackQuery;
    if (data === 'cancel_premium_account') {
      await ctx.reply('已取消操作');
      return;
    }
  }

  if (!message?.text) {
    await ctx.reply(
      '❗ 请输入正确的Telegram账号\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await premiumConversation(conversation, ctx, { duration, proxy });
  }

  const { isValid, username } = isValidTelegramFormat(message.text);

  if (!isValid) {
    await ctx.reply(
      '❗ 账号格式无效，请重新输入\n例如：@username 或 https://t.me/username',
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );
    return await premiumConversation(conversation, ctx, { duration, proxy });
  }

  try {
    debug('正在验证用户:', username);
    const { bot, botUser } = await findBotAndUser(ctx);
    const user = await getUserByUsername(bot.session, username);
    if (!user) {
      await ctx.reply('❗ 账号不存在或异常，请重新输入', {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      });
      return await premiumConversation(conversation, ctx, { duration, proxy });
    }

    debug('用户信息:', JSON.stringify(user));

    // 用户验证成功，可以继续处理
    // 创建premium订单
    const orderId = await IdGen.next(Premium, 'id', 6);

    await ctx.reply(
      [
        '⚠️ 请按全额支付，否则无法到账⚠️',
        '',
        `✈️ 飞机会员: ${PREMIUM_CONFIG.NAMES[duration]}`,
        '用户账号: @' + username,
        '用户昵称: ' + (user.first_name || username),
        `支付金额: ${PREMIUM_CONFIG.PRICES[duration]} USDT`,
        '收款地址: <code>' + bot.trx20_address + '</code> (点击地址可自动复制)',
        '',
        '❗ 请务必按全额支付，全额带小数',
        '⚠️ 禁止使用交易所代付',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text(
          '❌ 取消订单',
          `cancel_premium_order_${orderId}`,
        ),
      },
    );

    debug('duration', duration);

    // 解析 duration 为 limit_month
    let limit_month: number;
    // 解析 duration 为 limit_month（月数），支持 "3m"、"6m"、"1y" 等格式
    if (typeof duration === 'string') {
      if (duration.endsWith('m')) {
        // 例如 "3m"、"6m"，去掉 'm' 后转为数字
        limit_month = parseInt(duration.replace('m', ''), 10);
      } else if (duration.endsWith('y')) {
        // 例如 "1y"，这里约定 1y 表示 12 个月
        limit_month = 12;
      } else {
        // 其他字符串，尝试直接转为数字
        limit_month = Number(duration);
      }
    }

    // 计算过期时间
    const expiredAt = new Date();
    expiredAt.setMonth(expiredAt.getMonth() + limit_month);

    const premium = new Premium({
      id: orderId,
      bot: bot._id,
      botUser: botUser._id,
      proxy: proxy?._id,
      months: limit_month,
      to: bot.trx20_address,
      status: 'pending',
      amount: PREMIUM_CONFIG.PRICES[duration],
      userName: username,
      expiredAt,
    });

    debug('premium', JSON.stringify(premium));

    await premium.save();
  } catch (error) {
    debug('验证账号时出错:', error);
    await ctx.reply('❗ 验证账号时出现错误，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await premiumConversation(conversation, ctx, { duration, proxy });
  }
}

premiumCallback.use(createConversation(premiumConversation));

// Handle premium button clicks
premiumCallback.callbackQuery(/^buy_premium_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const duration = ctx.match[1];
  const proxy = ctx.currentProxyUser;
  await handleBuyPremiumCommand(ctx, duration);

  await ctx.conversation.enter('premiumConversation', { duration, proxy });
});

export default premiumCallback;
