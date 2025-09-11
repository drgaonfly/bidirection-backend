import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { MyContext } from '../../../types';
import { checkPermission } from '../../../middlewares/checkPermission';
import createDebug from 'debug';

const debug = createDebug('bot:membership');

const STAR_OPTIONS = [
  [100, 200, 300, 500],
  [1000, 2000, 3000, 5000],
  [10000, 20000, 30000, 50000],
];

// 主要处理函数
export async function handleMembershipCommand(ctx: MyContext) {
  debug('处理会员套餐请求');

  if (!ctx.currentBot.trx20_address) {
    await ctx.reply('请先设置该机器人的TRX20地址');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('🌟 购买星星', 'buy_stars')
    .text('🔒 匿名号码')
    .row()
    .text('3月会员 售价 15U', 'buy_premium_3m')
    .row()
    .text('6月会员 售价 25U', 'buy_premium_6m')
    .row()
    .text('1年会员 售价 45U', 'buy_premium_1y')
    .row()
    .text('取消', 'close');

  const isDev = process.env.NODE_ENV === 'development';
  const videoPath = isDev
    ? 'src/public/telegram_stars.mp4'
    : 'dist/public/telegram_stars.mp4';

  await ctx.replyWithVideo(new InputFile(videoPath), {
    caption: '请选择开通、购买 Telegram 产品:',
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleBuyStarsCommand(ctx: MyContext) {
  const keyboard = new InlineKeyboard();

  keyboard
    .text('⭐50星星=1U', 'stars_info_50')
    .text('⭐100星星=2U', 'stars_info_100')
    .row();

  STAR_OPTIONS.forEach((row) => {
    row.forEach((amount) => {
      keyboard.text(`${amount}`, `buy_stars_${amount}`);
    });
    keyboard.row();
  });

  keyboard.row().text('取消', 'close');

  const isDev = process.env.NODE_ENV === 'development';
  const videoPath = isDev
    ? 'src/public/telegram_stars.mp4'
    : 'dist/public/telegram_stars.mp4';

  await ctx.replyWithVideo(new InputFile(videoPath), {
    caption: '请选择购买星星(Telegram Stars)的数量:',
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}
// Composer 和事件处理
const membershipCommand = new Composer<MyContext>();

membershipCommand.callbackQuery('buy_stars', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleBuyStarsCommand(ctx);
});

membershipCommand.hears(/飞机会员/, checkPermission, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleMembershipCommand(ctx);
});

export default membershipCommand;
