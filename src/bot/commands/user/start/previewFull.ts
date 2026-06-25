import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot from '../../../../models/bot';
import { replaceVariables } from '../conversations/editMessage';
import createDebug from 'debug';

const previewFullComposer = new Composer<MyContext>();
const debug = createDebug('bot:previewFull');

previewFullComposer.callbackQuery(
  'preview_full',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('preview_full callback triggered');

    const bot = await Bot.findById(ctx.currentBot._id)
      .select('message medias buttons')
      .lean();

    if (!bot) return;

    // 替换消息中的变量
    const message = replaceVariables(bot.message || '', ctx);

    // 构建按钮键盘
    let keyboard: InlineKeyboard | undefined;
    if (bot.buttons && bot.buttons.length > 0) {
      keyboard = new InlineKeyboard();
      bot.buttons.forEach((button: any) => {
        if (button.type === 'url') {
          keyboard.url(button.text, button.value || '');
        } else if (button.type === 'callback') {
          keyboard.text(button.text, button.value || '');
        } else if (button.type === 'alert') {
          keyboard.text(button.text, button.value || '');
        }
        keyboard.row();
      });
    }

    // 发送媒体（如果有）
    if (bot.medias && bot.medias.length > 0) {
      for (const media of bot.medias) {
        try {
          if (media.type === 'photo') {
            if (media.fileId) {
              await ctx.replyWithPhoto(media.fileId, {
                caption: message,
                reply_markup: keyboard,
              });
            } else if (media.url) {
              await ctx.replyWithPhoto(media.url, {
                caption: message,
                reply_markup: keyboard,
              });
            }
          } else if (media.type === 'video') {
            if (media.fileId) {
              await ctx.replyWithVideo(media.fileId, {
                caption: message,
                reply_markup: keyboard,
              });
            } else if (media.url) {
              await ctx.replyWithVideo(media.url, {
                caption: message,
                reply_markup: keyboard,
              });
            }
          } else if (media.type === 'document') {
            if (media.fileId) {
              await ctx.replyWithDocument(media.fileId, {
                caption: message,
                reply_markup: keyboard,
              });
            } else if (media.url) {
              await ctx.replyWithDocument(media.url, {
                caption: message,
                reply_markup: keyboard,
              });
            }
          }
        } catch (err: any) {
          debug('Failed to send media in preview:', err.message);
        }
      }
      return;
    }

    // 没有媒体时发送纯文本消息
    await ctx.reply(message, { reply_markup: keyboard });
  },
);

export default previewFullComposer;
