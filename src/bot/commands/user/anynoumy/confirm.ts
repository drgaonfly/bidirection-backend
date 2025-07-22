import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkPermission } from '../../../middlewares/checkPermission';
import Anynoumy from '../../../../models/anynoumy';
import { IdGen } from '../../../../utils/idGen';
import createDebug from 'debug';

const confirmCallback = new Composer<MyContext>();

const debug = createDebug('bot:anynoumy');

// 捕捉回调，解析 days, amount, 是否带4

export async function handleAnynoumyConfirm(
  ctx: MyContext,
  days: number,
  amount: number,
  has4: boolean,
) {
  if (!ctx.currentBot.trx20_address) {
    await ctx.reply('该机器人未设置trx20地址');
    return;
  }

  // 计算 startAt 和 endAt
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);
  const expiredAt = new Date(startAt.getTime() + 15 * 60 * 1000);

  const anyoumy = await Anynoumy.create({
    id: await IdGen.next(Anynoumy, 'id', 6),
    bot: ctx.currentBot._id,
    botUser: ctx.currentBotUser._id,
    days,
    amount,
    has4,
    crypto_type: 'usdt',
    to_address: ctx.currentBot?.trx20_address,
    status: 'pending',
    startAt,
    endAt,
    expiredAt,
  });

  await ctx.reply(
    [
      `👤 用户：${ctx.currentBotUser?.displayName}`,
      `✈️ 您正在租用 +888匿名号码`,
      `➖➖➖➖➖➖➖➖➖➖`,
      `🔸租用时长: ${days} 天 [${has4 ? '带4' : '不带4'}]`,
      `🔹下单支付: ${amount}${anyoumy.crypto_type.toLowerCase()}`,
      `➖➖➖➖➖➖➖➖➖➖`,
      `\n`,
      `价格：${amount}U`,
      `\n`,
      `支付地址: USDT-TRC20`,
      `\n`,
      `<code>${anyoumy.to_address}</code>`,
      `👆 点一下复制【支付地址 / 金额】`,
      `➖➖➖➖➖➖➖➖➖➖`,
      `提示：`,
      `▫️订单支付超时为（15分钟）`,
      `▫️支付成功后等待30秒, 系统自动完成`,
      `▫️随机分配在【✈️888管理】自助接码`,
    ].join('\n'),
    {
      parse_mode: 'HTML',
    },
  );
}

// 捕捉 anynoumy:confirm:days_amount[_4] 回调
confirmCallback.callbackQuery(
  /^anynoumy:confirm:(\d+)_(\d+)(_4)?$/,
  checkPermission,
  async (ctx) => {
    debug('anynoumy:confirm');

    await ctx.conversation.exitAll();

    // 解析参数
    const match = ctx.callbackQuery.data.match(
      /^anynoumy:confirm:(\d+)_(\d+)(_4)?$/,
    );
    if (!match) {
      await ctx.reply('参数解析失败，请重试。');
      return;
    }
    const days = parseInt(match[1], 10);
    const amount = parseInt(match[2], 10);
    const has4 = !!match[3];

    await handleAnynoumyConfirm(ctx, days, amount, has4);
  },
);

export default confirmCallback;
