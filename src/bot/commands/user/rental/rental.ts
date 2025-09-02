import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { checkInBot } from '../../../middlewares/checkInBot';
import { getAdminUser } from '../../../../utils/buyTelegramPremium';
import createDebug from 'debug';

const rentalCommand = new Composer<MyContext>();

const debug = createDebug('bot:rental');

// 监听"联系客服"文本消息
export async function handleRentalCommand(
  ctx: MyContext,
  energy_per_times: number,
) {
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
  const price_pairs =
    ctx.currentBot.price_pairs?.filter((pair) => pair.type === 'hourly') || [];

  let pricePairLines: string[] = [];
  if (price_pairs.length > 0) {
    pricePairLines = price_pairs.map((pair) => {
      // 1 trx = 1_000_000 sun
      const energy = energy_per_times * pair.times;
      const trx = pair.sale;
      const hour = pair.expiration;
      // 能量显示为整数
      return `🔸${energy} 能量 (${hour}小时) :  ${trx} TRX   (${hour}小时内有效)`;
    });
  } else {
    pricePairLines = ['未配置闪兑套餐，请登录后台配置'];
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
rentalCommand.hears(/能量闪租/, checkInBot, async (ctx) => {
  await ctx.conversation.exitAll();

  const adminUser = await getAdminUser();

  if (!adminUser.energy_per_times) {
    throw new Error('管理员未设置每笔多少能量');
  }

  const energy_per_times = adminUser.energy_per_times;

  await handleRentalCommand(ctx, energy_per_times);
});

export default rentalCommand;
