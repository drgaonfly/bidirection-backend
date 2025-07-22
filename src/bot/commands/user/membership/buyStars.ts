import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { InputFile } from 'grammy';
import createDebug from 'debug';

const buyStarsCommand = new Composer<MyContext>();
const debug = createDebug('bot:buyStars');

// Handle the buy stars button click
export async function handleBuyStarsCommand(ctx: MyContext) {
  debug('buyStars');

  const starOptions = [
    [100, 200, 300, 500],
    [1000, 2000, 3000, 5000],
    [10000, 20000, 30000, 50000],
  ];

  const keyboard = new InlineKeyboard();

  // Add header text
  keyboard
    .text('⭐50星星=1U', 'stars_info_50')
    .text('⭐100星星=2U', 'stars_info_100')
    .row();

  // Create buttons for each star option
  starOptions.forEach((row) => {
    row.forEach((amount) => {
      keyboard.text(`${amount}`, `buy_stars_${amount}`);
    });
    keyboard.row();
  });

  // Add back button
  keyboard.row().text('取消', 'close');

  await ctx.replyWithVideo(new InputFile('src/public/telegram_stars.mp4'), {
    caption: '请选择购买星星(Telegram Stars)的数量:',
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

// Handle the buy stars callback
buyStarsCommand.callbackQuery(/^buy_stars_/, async (ctx) => {
  const amount = ctx.callbackQuery.data.replace('buy_stars_', '');
  await ctx.answerCallbackQuery();
  // Here you would implement the actual purchase logic
  await ctx.reply(`您选择购买 ${amount} 颗星星，请联系客服完成购买。`);
});

// Handle the info callbacks
buyStarsCommand.callbackQuery(/^stars_info_/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: ctx.callbackQuery.data.includes('50')
      ? '50颗星星=1U'
      : '100颗星星=2U',
    show_alert: true,
  });
});

// Handle back button
buyStarsCommand.callbackQuery('back_to_membership', async (ctx) => {
  await ctx.answerCallbackQuery();
  // Import and call the membership handler
  const { handleMembershipCommand } = await import('./membership');
  await handleMembershipCommand(ctx);
});

// Handle close button
buyStarsCommand.callbackQuery('close', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();
});

export default buyStarsCommand;
