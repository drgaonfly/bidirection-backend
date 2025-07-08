import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

import { checkPermission } from '../../../middlewares/checkPermission';

const rentalCommand = new Composer<MyContext>();

const debug = createDebug('bot:rental');

// 监听"联系客服"文本消息
export async function handleRentalCommand(ctx: MyContext) {
  debug('rental');

  const message = [
    '【🔋能量闪租🔋】',
    '🔸3笔 (1小时) :  9 TRX   (1小时内有效',
    '🔸2笔 (1小时) :  6 TRX   (1小时内有效',
    '🔸1笔 (1小时) :  3 TRX   (1小时内有效',
    `\n`,
    '1.向无U地址转账, 需要双倍能量。',
    '2.请在1小时内转账, 否则过期回收。',
    `\n`,
    '🔸<b>闪租能量收款地址:</b>',
    `<code>${ctx.currentBot.trx20_address}</code>`,
    '➖➖➖➖➖➖➖➖➖',
    '发送 /start 可以更新最新功能列表',
    '以下按钮可以选择其他能量租用模式：',
  ].join('\n');

  const inline = new InlineKeyboard()
    .text('⚡ 更多租用方式', 'more_rental_mode')
    .row()
    .text('⏰ 时长租用能量', 'rental_time')
    .text('🚀 手动速冲能量', 'rental_manual')
    .row()
    .text('💳 预支能量', 'energy_advance')
    .text('💎 充值余额', 'recharge');

  ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// 开始命令处理
rentalCommand.hears(/能量闪租/, checkPermission, async (ctx) => {
  await handleRentalCommand(ctx);
});

export default rentalCommand;
