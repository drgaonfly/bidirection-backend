import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot from '../../../../models/bot';
import createDebug from 'debug';

const configMenuComposer = new Composer<MyContext>();
const debug = createDebug('bot:configMenu');

configMenuComposer.callbackQuery(
  /^config_menu_/,
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('config_menu callback triggered');

    const bot = await Bot.findById(ctx.currentBot._id)
      .select('message medias buttons')
      .lean();

    if (!bot) return;

    // 显示当前配置状态

    const text = [
      '👋 启动消息',
      '',
      '在这个菜单中, 您可以设置当用户启动bot时将发送给他们的消息。',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('📷 媒体', 'edit_medias_list')
      .text('查看', 'view_medias')
      .row()
      .text('📝 文本', 'edit_message_text')
      .text('查看', 'view_message')
      .row()
      .text('🔘 按钮', 'edit_buttons_list')
      .text('查看', 'view_buttons')
      .row()
      .text('完整预览', 'preview_full')
      .row()
      .text('❌ 返回', 'close');

    try {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
      });
    } catch (err: any) {
      await ctx.reply(text, {
        reply_markup: keyboard,
      });
    }
  },
);

export default configMenuComposer;
