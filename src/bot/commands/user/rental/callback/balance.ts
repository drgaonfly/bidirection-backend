import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../../types';
import Rental from '../../../../../models/rental';
import { rentEnergy } from '../../../../../utils/fetchTransactions';
import createDebug from 'debug';

const balanceRentalCommand = new Composer<MyContext>();
const debug = createDebug('bot:confirm-rental');

// 确认租用订单回调处理
balanceRentalCommand.callbackQuery(/^balance_rental_(.+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^balance_rental_(.+)$/);
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

  if (
    ctx.currentBotUserConfig.trx_balance < rental.price ||
    ctx.currentBotUserConfig.usdt_balance < rental.price
  ) {
    await ctx.reply('余额不足, 请先充值', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('立即充值', 'recharge'),
    });
    return;
  }

  const info = [
    '租赁成功!',
    `订单ID:  <code>${rental.id}</code>`,
    `购买能量: <code>${rental.amount}</code> (1小时)`,
    `实时单价: <code>${
      rental.price / rental.separation
    } ${rental.crypto_type.toUpperCase()}</code>`,
    `订单总额: <b>${rental.price} ${rental.crypto_type.toUpperCase()}</b>`,
    `接收地址: <code>${rental.to_address}</code>`,
  ].join('\n');

  await ctx.deleteMessage();

  const result = await rentEnergy(rental, rental.from_address, rental.amount);

  if (result) {
    if (rental.crypto_type === 'trx') {
      ctx.currentBotUserConfig.trx_balance -= rental.price;
    } else {
      ctx.currentBotUserConfig.usdt_balance -= rental.price;
    }

    await ctx.currentBotUserConfig.save();

    rental.status = 'completed';
    await rental.save();

    await ctx.reply(info, {
      parse_mode: 'HTML',
    });
  } else {
    await ctx.reply('租赁失败，请稍后重试', {
      parse_mode: 'HTML',
    });
  }
});

export default balanceRentalCommand;
