import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

import { checkPermission } from '../../../middlewares/checkPermission';

const rentalCommand = new Composer<MyContext>();

const debug = createDebug('bot:rental');

// 监听"联系客服"文本消息
export async function handleRentalCommand(ctx: MyContext) {
  debug('rental');

  await ctx.conversation.exitAll();

  if (!ctx.currentBot.energy_address) {
    await ctx.reply('请先设置该机器人的能量地址');
    return;
  }

  if (!ctx.currentBot.price_pairs) {
    await ctx.reply('请先设置该机器人的闪兑套餐');
    return;
  }

  const price_pairs = ctx.currentBot.price_pairs || [];

  let pricePairLines: string[] = [];
  if (price_pairs.length > 0) {
    pricePairLines = price_pairs.map((pair) => {
      // 1 trx = 1_000_000 sun
      const energy = pair.aqusition;
      const trx = pair.expenditure;
      const hour = pair.expiration;
      // 能量显示为整数
      return `🔸${energy} 能量 (${hour}小时) :  ${trx} TRX   (${hour}小时内有效)`;
    });
  } else {
    pricePairLines = ['未配置闪兑套餐，请联系管理员。'];
  }

  const message = [
    '【🔋能量闪租🔋】',
    ...pricePairLines,
    `\n`,
    '1.向无U地址转账, 需要双倍能量。',
    '2.请在1小时内转账, 否则过期回收。',
    `\n`,
    '🔸<b>闪租能量收款地址:</b>',
    `<code>${ctx.currentBot.energy_address}</code>`,
    '➖➖➖➖➖➖➖➖➖',
    '发送 /start 可以更新最新功能列表',
    '以下按钮可以选择其他能量租用模式：',
  ].join('\n');

  const inline = new InlineKeyboard()
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
