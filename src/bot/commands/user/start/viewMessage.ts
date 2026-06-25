import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot from '../../../../models/bot';
import createDebug from 'debug';

const viewMessageComposer = new Composer<MyContext>();
const debug = createDebug('bot:viewMessage');

viewMessageComposer.callbackQuery(
  'view_message',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('view_message callback triggered');

    const bot = await Bot.findById(ctx.currentBot._id).select('message').lean();

    if (!bot) return;

    if (!bot.message) {
      await ctx.answerCallbackQuery({
        text: '暂无文本消息',
        show_alert: true,
      });
      return;
    }

    const text = `📝 文本消息内容：\n\n${bot.message}`;

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

export default viewMessageComposer;
