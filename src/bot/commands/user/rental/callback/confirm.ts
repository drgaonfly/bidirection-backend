import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';
import Rental from '../../../../../models/rental';
import * as QRCode from 'qrcode';
import { InputFile } from 'grammy';
import { getAdminUser } from '../../../../../utils/buyTelegramPremium';

const confirmRentalCommand = new Composer<MyContext>();
const debug = createDebug('bot:confirm-rental');

// 确认租用订单回调处理
confirmRentalCommand.callbackQuery(/^confirm_rental_(.+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^confirm_rental_(.+)$/);
  if (!match) {
    await ctx.answerCallbackQuery({ text: '订单ID无效', show_alert: true });
    return;
  }
  const rentalId = match[1];

  debug('确认租用订单: %s', rentalId);

  // 查找订单
  const rental = await Rental.findOne({ id: rentalId });
  if (!rental) {
    await ctx.answerCallbackQuery({ text: '未找到订单', show_alert: true });
    return;
  }

  if (rental.status !== 'pending') {
    await ctx.answerCallbackQuery({
      text: '订单已处理或已失效',
      show_alert: true,
    });
    return;
  }

  // 生成不重复的随机金额（如 20.567），小数点后三位
  let uniqueAmount: number | undefined;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  const baseAmount = rental.price;

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
    const randomIncrease = Number((baseAmount * percent).toFixed(3));
    uniqueAmount = Number((baseAmount + randomIncrease).toFixed(3));
    debug(`尝试生成金额: ${uniqueAmount}, 第 ${attempts + 1} 次尝试`);

    // 检查是否存在相同金额的待支付订单
    const existingAmountPayment = await Rental.findOne({
      price: uniqueAmount,
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

  rental.price = uniqueAmount;
  await rental.save();

  const qrBuffer = await QRCode.toBuffer(rental.from_address, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: 'H',
  });

  const message = [
    '✅ <b>确认订单</b>',
    `🆔 订单ID:  <code>${rental.id}</code>`,
    `⚡️ 购买能量:  <b>${rental.amount}</b>`,
    '---------------------------------',
    '💸 <b>支付信息</b>:',
    `💰 支付金额: <b>${rental.price} ${rental.crypto_type.toUpperCase()}</b>`,
    '---------------------------------',
    '⏰ <b>支付提醒</b>',
    `\n`,
    `📋 请复制金额，注意小数点： <code>${
      rental.price
    }</code> <b>${rental.crypto_type.toUpperCase()}</b>，金额错误将无法发货`,
    '\n',
    '📥 请复制地址付款，或者扫描上方二维码付款',
    '⚠️ 收款地址有效60分钟，超时请不要支付!!!',
  ].join('\n');

  await ctx.deleteMessage();

  debug('使用 replyWithPhoto 发送二维码');
  await ctx.replyWithPhoto(new InputFile(qrBuffer), {
    caption: message,
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('取消', 'close'),
  });

  await ctx.answerCallbackQuery({ text: '订单已确认', show_alert: false });
});

export default confirmRentalCommand;
