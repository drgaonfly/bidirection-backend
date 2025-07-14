import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { InputFile } from 'grammy';
import createDebug from 'debug';

import { checkPermission } from '../../../middlewares/checkPermission';

const membershipCommand = new Composer<MyContext>();

const debug = createDebug('bot:membership');

// 监听"会员套餐"文本消息
export async function handleMembershipCommand(ctx: MyContext) {
  debug('membership');

  const inline = new InlineKeyboard()
    .text('🌟 购买星星')
    .text('🔒 匿名号码')
    .row()
    .text('3月会员 售价 15U')
    .row()
    .text('6月会员 售价 25U')
    .row()
    .text('1年会员 售价 45U')
    .row()
    .text('取消', 'close');

  ctx.replyWithVideo(new InputFile('./tmp/telegram_premium.mp4'), {
    caption: '请选择开通、购买 Telegram 产品:',
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// 开始命令处理
membershipCommand.hears(/飞机会员/, checkPermission, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleMembershipCommand(ctx);
});

export default membershipCommand;
