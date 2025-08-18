import { MyContext } from '../../../../types';
import Payment from '../../../../../models/payment';
import { IdGen } from '../../../../../utils/idGen';
import * as QRCode from 'qrcode';
import { InputFile, InlineKeyboard } from 'grammy';
import { formatBeijingDate } from '../../../../../utils/formatBeijingDate';
import { generateOrderNumber } from '../../../../../utils/generateOrderNumber'; // 导入生成订单号的函数
import createDebug from 'debug';
import { chargeOptions } from '../../../../../models/payment';
import BotUser from '../../../../../models/botUser';
import Bot, { IBot } from '../../../../../models/bot';
import { getAdminUser } from '../../../../../utils/buyTelegramPremium';

const debug = createDebug('bot:recharge:callback');

/**
 * 处理充值请求的通用方法
 * @param ctx Telegram上下文
 * @param amount 充值金额（整数部分）
 * @returns 处理结果，成功返回true，失败返回false
 */
export async function handleRechargeRequest(
  ctx: MyContext,
  amount: number,
  crypto_type: string,
  bot: IBot,
): Promise<boolean> {
  debug('handleRechargeRequest', ctx);

  let botUser = ctx.currentBotUser;

  if (!botUser) {
    botUser = await BotUser.findOne({
      id: ctx.update.callback_query.from.id.toString(),
    });
  }

  if (!bot) {
    bot = await Bot.findOne({ id: ctx.me.id.toString() });
  }

  debug('开始处理充值请求', { userId: botUser._id, amount });

  const address = bot.trx20_address;
  if (!address) {
    debug('未设置收款地址');
    await ctx.reply('机器人还未设置收款地址');
    return false;
  }

  // 处理自定义金额和预设金额
  // chargeOptions 里 amount 可能为 null（自定义/取消），所以要排除掉
  let chargeInfo = chargeOptions.find(
    (opt) => typeof opt.amount === 'number' && opt.amount === amount,
  );
  if (!chargeInfo) {
    // 不是预设金额，视为自定义金额
    chargeInfo = {
      amount,
      label: `${amount} USDT`,
      callback: 'charge_custom',
    };
  }

  // 检查是否存在未过期的相同金额充值订单（只比较整数部分）
  debug('检查是否存在未过期的相同金额充值订单');
  // 优化：用 chargeInfo.amount 精确查找，避免仅用 amount 字段
  const existingPayment = await Payment.findOne({
    status: 'pending',
    expiredAt: { $gt: new Date() },
    'chargeInfo.amount': chargeInfo.amount,
    botUser: botUser._id,
    bot: bot._id,
    type: 'recharge',
  });

  let payment;

  if (existingPayment) {
    debug('存在未过期的充值订单，刷新过期时间', {
      orderNumber: existingPayment.orderNumber,
    });
    // 刷新过期时间
    existingPayment.expiredAt = new Date(Date.now() + 30 * 60 * 1000);
    await existingPayment.save();
    payment = existingPayment;
  } else {
    debug('不存在未过期充值订单，创建新订单');
    // 创建新订单
    const orderNumber = await generateOrderNumber();

    // 生成不重复的随机金额（如 20.567），小数点后三位
    let uniqueAmount: number | undefined;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    const baseAmount = chargeInfo.amount ?? amount;

    const admin = await getAdminUser();

    debug('开始生成不重复的随机金额');
    while (!isUnique && attempts < maxAttempts) {
      // 随机加 1% 到 3%（含），保留三位小数
      // 取 admin.recharge_min ~ admin.recharge_max 之间的百分比，默认 0.01 ~ 0.03
      const minPercent =
        typeof admin.recharge_min === 'number' && admin.recharge_min > 0
          ? admin.recharge_min / 100
          : 0.01;
      const maxPercent =
        typeof admin.recharge_max === 'number' && admin.recharge_max > 0
          ? admin.recharge_max / 100
          : 0.03;
      const percent = minPercent + Math.random() * (maxPercent - minPercent);
      const randomIncrease = Number((1 * percent).toFixed(3));
      uniqueAmount = Number((baseAmount + randomIncrease).toFixed(3));
      debug(`尝试生成金额: ${uniqueAmount}, 第 ${attempts + 1} 次尝试`);

      // 检查是否存在相同金额的待支付订单
      const existingAmountPayment = await Payment.findOne({
        amount: uniqueAmount,
        status: 'pending',
        expiredAt: { $gt: new Date() },
      });

      if (!existingAmountPayment) {
        debug('生成唯一金额成功:', uniqueAmount);
        isUnique = true;
      } else {
        debug('金额重复，继续尝试');
      }
      attempts++;
    }

    if (!isUnique) {
      debug('无法生成唯一的支付金额，已达到最大尝试次数');
      await ctx.reply('无法生成唯一的支付金额，请重试');
      return false;
    }

    payment = new Payment({
      id: await IdGen.next(Payment, 'id', 6),
      orderNumber,
      botUser: botUser._id,
      bot: bot._id,
      amount: uniqueAmount,
      receiveAddress: address,
      status: 'pending',
      type: 'recharge',
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      tgChatId: ctx.chat?.id,
      tgMessageId: ctx.callbackQuery?.message?.message_id,
      chargeInfo: {
        amount: chargeInfo.amount,
        label: chargeInfo.label,
        callback: chargeInfo.callback,
      },
      crypto_type,
      proxy: bot.user,
    });

    await payment.save();
    debug('新支付记录创建成功:', payment.orderNumber);
  }

  if (!payment) {
    debug('支付记录创建失败');
    await ctx.reply('支付记录创建失败，请重试');
    return false;
  }

  // 生成二维码
  debug('生成收款二维码', { address: payment.receiveAddress });
  const qrBuffer = await QRCode.toBuffer(payment.receiveAddress, {
    margin: 1,
    width: 200,
    errorCorrectionLevel: 'H',
  });

  debug('渲染充值消息', { orderNumber: payment.orderNumber });
  // 这里直接写死文案，不用国际化
  const message = [
    `<b>充值订单</b>`,
    `订单号：<code>${payment.orderNumber}</code>`,
    `充值金额：<b>${payment.amount} ${crypto_type.toUpperCase()}</b>`,
    `收款地址：<code>${payment.receiveAddress}</code>`,
    `创建时间：${formatBeijingDate(payment.createdAt)}`,
    payment.expiredAt
      ? `过期时间：${formatBeijingDate(payment.expiredAt)}`
      : '',
    '',
    '\n请在15分钟内支付完成，否则订单失效。',
    '❗️❗️❗️❗️请使用 USDT-TRC20 网络转账，转账金额需与上方金额完全一致。',
    '转账完成后，系统会自动检测到账，无需手动提交。',
    '',
    '如有疑问请联系客服。',
  ]
    .filter(Boolean)
    .join('\n');

  const keyboard = new InlineKeyboard()
    .text('❌ 取消订单', `recharge:cancel_${payment._id}`)
    .url('联系客服', bot.customer_service_link || 'https://t.me/infoswqz')
    .row()
    .text('🔄 再充一笔', 'recharge:again');

  // 优先 editMessageCaption，如果失败则 replyWithPhoto
  // 特定金额
  if (ctx.callbackQuery?.message?.message_id && ctx.currentBot) {
    try {
      debug('尝试 editMessageMedia 发送二维码');
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: new InputFile(qrBuffer),
          caption: message,
          parse_mode: 'HTML',
        },
        {
          reply_markup: keyboard,
        },
      );
      debug('editMessageMedia 成功');
      return true;
    } catch (err: any) {
      debug('editMessageMedia 失败，fallback 到 replyWithPhoto', err);
      return false;
      // fallback to replyWithPhoto
    }
  }

  debug('使用 replyWithPhoto 发送二维码');
  await ctx.replyWithPhoto(new InputFile(qrBuffer), {
    caption: message,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  debug('充值流程处理完毕');
  return true;
}
