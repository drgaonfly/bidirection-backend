import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import createDebug from 'debug';

const configMenuComposer = new Composer<MyContext>();
const debug = createDebug('bot:configMenu');

configMenuComposer.callbackQuery(
  /^config_menu_/,
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('config_menu callback triggered');

    const text = [
      '👋 启动消息',
      '',
      '点击下方按钮打开编辑器，可在一个页面内编辑文本、按钮和媒体。',
    ].join('\n');

    const miniAppUrl = `${process.env.WEBHOOK_URL}/mini-app/bot-config.html?botId=${ctx.currentBot._id}`;

    const keyboard = new InlineKeyboard()
      .webApp('✏️ 编辑启动信息', miniAppUrl)
      .row()
      .text('❌ 返回', 'close');

    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (err: any) {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  },
);

export default configMenuComposer;
