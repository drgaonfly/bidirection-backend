import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { checkPermission } from '../../../middlewares/checkPermission';

import createDebug from 'debug';

const advanceCommand = new Composer<MyContext>();

const debug = createDebug('bot:advance');

export async function handleAdvance(ctx: MyContext) {
  const userName = ctx.currentBot.userName;
  const spread_code = ctx.currentBotUserConfig.spread_code;

  const message = [
    `${ctx.currentBotUser.userName}您好!`,
    `您的积分余额: ${ctx.currentBotUserConfig.point}`,
    `本机器人需要积分大于${ctx.currentBot.min_interger_limit}积分才可以使用预支服务`,
    `复制下列👇链接邀请好友使用，可以增加积分`,
    `<code>https://t.me/${userName}?start=${spread_code}</code>`,
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('预支能量', 'advance:confirm'),
  });
}

// advance 命令处理
advanceCommand.command('advance', checkPermission, async (ctx) => {
  debug('advance');
  await ctx.conversation.exitAll();
  await handleAdvance(ctx);
});

// 开始命令处理
advanceCommand.hears(/能量预支/, checkPermission, async (ctx) => {
  debug('advance');
  await ctx.conversation.exitAll();
  await handleAdvance(ctx);
});

export default advanceCommand;
