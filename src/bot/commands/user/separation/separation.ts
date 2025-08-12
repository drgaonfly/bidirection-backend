import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

import { checkPermission } from '../../../middlewares/checkPermission';

const separationCommand = new Composer<MyContext>();

const debug = createDebug('bot:separation');

// 监听"联系客服"文本消息
export async function handleSeparationCommand(ctx: MyContext) {
  debug('separation');

  const message = [
    '🔥<b>笔数套餐</b>🔥 <b>(无时间限制)</b>',
    '1️⃣选择笔数，2️⃣填写地址，3️⃣转账开通',
    `\n`,
    '💹一笔转账131K = 5TRX / 实时U价',
    `\n`,
    '🔺24小时不用, 自动扣一笔',
    '🔺对方不管什么地址都是扣一笔',
    '🔺转移笔数到其他地址请联系老板',
    '🔺为他人购买，填写他人地址即可',
    `\n`,
    '48小时不转账自动暂停开启保护',
    `(点击开启按钮即可成功开启)`,
  ].join('\n');

  const Options = ctx.currentBot.price_pairs.filter(
    (opt) => opt.type !== 'hourly',
  );

  // 每行放几个按钮？
  const buttonsPerRow = 2;

  const inline = new InlineKeyboard();

  Options.forEach((opt, index) => {
    inline.text(opt?.name, `rental_sep_${opt._id}`);
    if ((index + 1) % buttonsPerRow === 0) {
      inline.row();
    }
  });

  ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// 开始命令处理
separationCommand.hears(/笔数套餐/, checkPermission, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleSeparationCommand(ctx);
});

export default separationCommand;
