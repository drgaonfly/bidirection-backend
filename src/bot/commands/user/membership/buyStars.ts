import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import path from 'path';
import { InputFile } from 'grammy';
import createDebug from 'debug';

const buyStarsCommand = new Composer<MyContext>();
const debug = createDebug('bot:buyStars');

// 处理购买星星按钮点击
export async function handleBuyStarsCommand(ctx: MyContext) {
  debug('buyStars');

  const starOptions = [
    [100, 200, 300, 500],
    [1000, 2000, 3000, 5000],
    [10000, 20000, 30000, 50000],
  ];

  const keyboard = new InlineKeyboard();

  // 添加头部说明
  keyboard
    .text('⭐50星星=1U', 'stars_info_50')
    .text('⭐100星星=2U', 'stars_info_100')
    .row();

  // 为每个星星选项创建按钮
  starOptions.forEach((row) => {
    row.forEach((amount) => {
      keyboard.text(`${amount}`, `buy_stars_${amount}`);
    });
    keyboard.row();
  });

  // 添加取消按钮
  keyboard.row().text('取消', 'close');

  const isDev = process.env.NODE_ENV === 'development' ? true : false;

  const videoPath = path.resolve(
    __dirname,
    isDev ? '/src/public/telegram_stars.mp4' : 'dist/public/telegram_stars.mp4',
  );

  await ctx.replyWithVideo(new InputFile(videoPath), {
    caption: '请选择购买星星(Telegram Stars)的数量:',
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

// 处理购买星星的回调

// 处理星星价格说明的回调
buyStarsCommand.callbackQuery(/^stars_info_/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: ctx.callbackQuery.data.includes('50')
      ? '50颗星星=1U'
      : '100颗星星=2U',
    show_alert: true,
  });
});

// 处理关闭按钮
buyStarsCommand.callbackQuery('close', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();
});

export default buyStarsCommand;
