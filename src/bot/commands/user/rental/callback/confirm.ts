import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';
import Rental from '../../../../../models/rental';
import * as QRCode from 'qrcode';
import { InputFile } from 'grammy';

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

  const qrBuffer = await QRCode.toBuffer(rental.from_address, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: 'H',
  });

  const message = [
    '确认订单',
    `订单ID:  <code>${rental.id}</code>`,
    `购买能量:  ${rental.amount}`,
    `实时单价:  <b>${ctx.currentBot.uni_energy_price}</b>`,
    '---------------------------------',
    '支付信息:',
    `支付金额: ${rental.price} <b>${rental.crypto_type.toUpperCase()}</b>`,
    '---------------------------------',
    '支付提醒',
    `\n`,
    `请复制金额，注意小数点： <code>${
      rental.price
    }</code> <b>${rental.crypto_type.toUpperCase()}</b>, 金额错误将无法发货`,
    '\n',
    '请复制地址付款,或者扫描上方二维码付款',
    '收款地址有效60分钟,超时请不要支付!!!',
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
