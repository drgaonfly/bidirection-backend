import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

const separationCommand = new Composer<MyContext>();

const debug = createDebug('bot:separation');

// 监听"联系客服"文本消息
export async function handleSeparationCommand(ctx: MyContext) {
  debug('separation');

  const message = [
    '🔥<b>笔数套餐</b>🔥 <b>(无时间限制)</b>',
    '功能说明：根据自己的用量选笔数。购买的笔数可以自己用也可分享他人地址使用，实时更改地址。',
    `\n`,
    '使用流程 ：',
    '1️⃣选择笔数。',
    '2️⃣绑定地址。（自由更改）',
    '3️⃣分享他人使用（全网首创）',
    `\n`,
    '🔺24小时不用, 自动扣2笔',
    '🔺对方地址🈶USDT扣1笔',
    '🔺对方地址🈚️USDT扣2笔',
    '🔺对方交易所地址扣2笔',
    `\n`,
    '💹当前向地址转账手续行情：',
    '🈶U地址≈取行情TRX≈计算USDT',
    '🈚️U地址≈取行情TRX≈计算USDT',
    `\n`,
    '根据以上手续费行情，选择能量笔数套餐是明智选择。',
    `\n`,
    '48小时不转账自动暂停开启保护',
    '(点击开启按钮即可成功开启)',
  ].join('\n');

  const Options = ctx.currentBot.price_pairs.filter(
    (opt) => opt.type === 'daily',
  );

  if (Options.length === 0) {
    await ctx.reply('该机器人暂无日租套餐, 请先到后台设置');
    return;
  }

  // 每行放几个按钮？
  const buttonsPerRow = 2;

  const inline = new InlineKeyboard();

  Options.forEach((opt, index) => {
    inline.text(opt?.name, `rental_sep_${opt._id}`);
    if ((index + 1) % buttonsPerRow === 0) {
      inline.row();
    }
  });

  inline.row().text('📝 我的笔数套餐', 'my_packageOrder');

  ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// 开始命令处理
separationCommand.hears(/笔数套餐/, async (ctx) => {
  await ctx.conversation.exitAll();
  await handleSeparationCommand(ctx);
});

export default separationCommand;
