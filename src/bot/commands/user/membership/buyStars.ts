import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { InputFile } from 'grammy';
import createDebug from 'debug';
import { renderFile } from 'ejs';
import { join } from 'path';

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

  await ctx.replyWithVideo(new InputFile('src/public/telegram_stars.mp4'), {
    caption: '请选择购买星星(Telegram Stars)的数量:',
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

// 处理购买星星的回调
buyStarsCommand.callbackQuery(/^buy_stars_/, async (ctx) => {
  const amount = parseInt(ctx.callbackQuery.data.replace('buy_stars_', ''));
  await ctx.answerCallbackQuery();

  // 计算价格（50星星=1U）
  const price = (amount / 50).toFixed(2);

  try {
    const message = await renderFile(
      join(__dirname, '../../../../templates/buyStars.ejs'),
      {
        membershipName: `${amount}颗星星`,
        price: parseFloat(price),
      },
    );

    await ctx.reply(message, {
      parse_mode: 'HTML',
    });
  } catch (error) {
    debug('渲染buyStars模板出错:', error);
    await ctx.reply('抱歉，处理您的请求时出现错误。请稍后再试。');
  }
});

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
