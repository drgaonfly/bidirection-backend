import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { InputFile } from 'grammy';
import { handleBuyStarsCommand } from './buyStars';
import createDebug from 'debug';

import { checkPermission } from '../../../middlewares/checkPermission';

const membershipCommand = new Composer<MyContext>();

const debug = createDebug('bot:membership');

// 监听"会员套餐"文本消息
export async function handleMembershipCommand(ctx: MyContext) {
  debug('membership');

  if (!ctx.currentBot.trx20_address) {
    await ctx.reply('请先设置该机器人的TRX20地址');

    return;
  }

  const inline = new InlineKeyboard()
    .text('🌟 购买星星', 'buy_stars')
    .text('🔒 匿名号码')
    .row()
    .text('3月会员 售价 15U', 'buy_membership_3m')
    .row()
    .text('6月会员 售价 25U', 'buy_membership_6m')
    .row()
    .text('1年会员 售价 45U', 'buy_membership_1y')
    .row()
    .text('取消', 'close');

  const isDev = process.env.NODE_ENV === 'development' ? true : false;

  const videoPath = isDev
    ? 'src/public/telegram_stars.mp4'
    : 'dist/public/telegram_stars.mp4';

  ctx.replyWithVideo(new InputFile(videoPath), {
    caption: '请选择开通、购买 Telegram 产品:',
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// Handle buy stars button click
membershipCommand.callbackQuery('buy_stars', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleBuyStarsCommand(ctx);
});

// 开始命令处理
membershipCommand.hears(/飞机会员/, checkPermission, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleMembershipCommand(ctx);
});

export default membershipCommand;
