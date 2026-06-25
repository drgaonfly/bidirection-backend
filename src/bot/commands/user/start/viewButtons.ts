import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot from '../../../../models/bot';
import createDebug from 'debug';

const viewButtonsComposer = new Composer<MyContext>();
const debug = createDebug('bot:viewButtons');

viewButtonsComposer.callbackQuery(
  'view_buttons',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('view_buttons callback triggered');

    const bot = await Bot.findById(ctx.currentBot._id).select('buttons').lean();

    if (!bot) return;

    if (!bot.buttons || bot.buttons.length === 0) {
      await ctx.answerCallbackQuery({
        text: '暂无按钮配置',
        show_alert: true,
      });
      return;
    }

    let text = '🔘 按钮配置列表：\n\n';
    bot.buttons.forEach((button: any, index: number) => {
      const typeText =
        button.type === 'url'
          ? '链接'
          : button.type === 'callback'
            ? '回调'
            : '弹窗';
      const valueText = button.value ? ` (${button.value})` : '';
      text += `${index + 1}. [${typeText}] ${button.text}${valueText}\n`;
    });

    const keyboard = new InlineKeyboard().text(
      '❌ 返回',
      `config_menu_${ctx.currentBot._id}`,
    );

    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (err: any) {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  },
);

export default viewButtonsComposer;
