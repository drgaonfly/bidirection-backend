import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { MyContext } from '../../../types';
import { checkInBot } from '../../../middlewares/checkInBot';
import { getAdminUser } from '../../../../utils/getAdminUser';
import createDebug from 'debug';
import fs from 'fs';
import path from 'path';

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
    await ctx.reply('请先设置该机器人的能量地址', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().url(
        '📞 联系客服',
        ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
      ),
    });
    return;
  }

  if (!ctx.currentBot.price_pairs) {
    await ctx.reply('请先设置该机器人的闪兑套餐', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().url(
        '📞 联系客服',
        ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
      ),
    });
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
      // 能量显示为整数
      return `🔸${energy} 能量 (${pair.times}笔) :  ${trx} TRX  （对方${
        pair.times === 1 ? '🈶U' : '🈚️U'
      }）`;
    });
  } else {
    pricePairLines = ['未配置闪兑套餐，请登录后台配置'];
  }

  const message = [
    '【<b>🔋能量闪租🔋</b>】 (<b>1小时内有效</b>)',
    '<b>功能说明：</b>',
    '用户只需向我们下面提供的地址转入指定TRX即可获得对应的能量。此功能可以<b>节省90%</b>的<b>转账手续费</b>。',
    '',
    ...pricePairLines,
    '',
    '1.对方🈶U，需要一笔',
    '2.对方🈚️U或交易所，需要两笔',
    '3.请在1小时内转账, 否则过期回收。',
    '',
    '',
    '🔸<b>闪租能量收款地址:(点击地址自动复制)</b>',
    `<code>${ctx.currentBot.energy_address}</code>`,
    '➖➖➖➖➖➖➖➖➖',
    '发送 /start 可以更新最新功能列表',
    '以下按钮可以选择其他能量租用模式：',
  ].join('\n');

  const inline = new InlineKeyboard()
    .text('💳 预支能量', 'energy_advance')
    .text('💎 充值余额', 'recharge');

  // Check if rentImage exists and send with image, otherwise send text message
  if (ctx.currentBot.rentImage) {
    const imagePath = path.join(process.cwd(), 'tmp', ctx.currentBot.rentImage);

    if (fs.existsSync(imagePath)) {
      await ctx.replyWithPhoto(new InputFile(imagePath), {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: inline,
      });
    } else {
      await ctx.reply('没有找到后台上传的图片，是否已经被删除？');
      return;
    }
  } else {
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: inline,
    });
  }
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
