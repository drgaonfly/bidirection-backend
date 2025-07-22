import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { checkPermission } from '../../../middlewares/checkPermission';

import createDebug from 'debug';

const anynoumyCommand = new Composer<MyContext>();

const debug = createDebug('bot:anynoumy');

export async function handleAnynoumy(ctx: MyContext) {
  const message = [
    `您可以租用电报 +888匿名号码`,
    `➖➖➖➖➖➖➖➖➖➖➖`,
    `业务量差？信任度不够？`,
    `仅需0.6U每天，立即拥有888号`,
    `快速提升信任度的关键因素！`,
    `\n`,
    `例如`,
    `+888 06580109 无4`,
    `+888 06584310 带4`,
    `\n`,
    `提示：随机+888号码，不支持选号`,
    `全天：24小时，机器人内自助接码`,
    `➖➖➖➖➖➖➖➖➖➖➖`,
    `当前剩余【${79}个】+888号可租用`,
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('带4 | 租30天 25U', 'anynoumy:confirm:30_25_4')
      .text('不4 | 租30天 28U', 'anynoumy:confirm:30_28')
      .row()
      .text('使用介绍'),
  });
}

// anynoumy 命令处理
anynoumyCommand.command('anynoumy', checkPermission, async (ctx) => {
  debug('anynoumy');

  await ctx.conversation.exitAll();

  await handleAnynoumy(ctx);
});

anynoumyCommand.hears(/888租用/, checkPermission, async (ctx) => {
  debug('anynoumy');

  await ctx.conversation.exitAll();

  await handleAnynoumy(ctx);
});

export default anynoumyCommand;
