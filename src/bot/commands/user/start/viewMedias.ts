import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot from '../../../../models/bot';
import createDebug from 'debug';

const viewMediasComposer = new Composer<MyContext>();
const debug = createDebug('bot:viewMedias');

viewMediasComposer.callbackQuery(
  'view_medias',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('view_medias callback triggered');

    const bot = await Bot.findById(ctx.currentBot._id).select('medias').lean();

    if (!bot) return;

    if (!bot.medias || bot.medias.length === 0) {
      await ctx.answerCallbackQuery({
        text: '暂无媒体文件',
        show_alert: true,
      });
      return;
    }

    let text = '📷 媒体文件列表：\n\n';
    bot.medias.forEach((media: any, index: number) => {
      const typeText =
        media.type === 'photo'
          ? '图片'
          : media.type === 'video'
            ? '视频'
            : '文档';
      const sourceText = media.fileId ? 'FileId' : 'URL';
      text += `${index + 1}. [${typeText}] ${sourceText}\n`;
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

export default viewMediasComposer;
