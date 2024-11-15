import { Composer } from 'grammy';
import { MyContext } from '../../types';
import { exampleInlineMenu, mainKeyboard } from '../../menus';

const startCommand = new Composer<MyContext>();

startCommand.command('start', async (ctx) => {
  await ctx.reply('欢迎使用我的 Telegram 机器人！请选择一个选项：', {
    reply_markup: mainKeyboard,
  });

  // 示例：发送一个带有 Inline Menu 的消息
  await ctx.reply('这是一个带有 Inline 按钮的消息：', {
    reply_markup: exampleInlineMenu,
  });
});

export default startCommand;
