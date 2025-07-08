import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';

import { checkPermission } from '../../../../middlewares/checkPermission';

const rentalByTimesCommand = new Composer<MyContext>();

const debug = createDebug('bot:rental by times');

// 监听"联系客服"文本消息
export async function handleRentalTimeCommand(ctx: MyContext) {
  debug('rental by times');

  const message = [
    '租用能量,转账无需TRX消耗, 0手续费!!!',
    '-------------------------',
    '发送 /start 获取菜单',
    '提示: 对未激活地址转账手续费需要双倍',
  ].join('\n');

  const inline = new InlineKeyboard()
    .text('⚡ 更多租用方式', 'more_rental_mode')
    .row()
    .text('1笔', 'rental_sep_1')
    .text('2笔', 'rental_sep_2')
    .text('3笔', 'rental_sep_3')
    .text('4笔', 'rental_sep_5');

  ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}

// 开始命令处理
rentalByTimesCommand.callbackQuery(
  'rental_time',
  checkPermission,
  async (ctx) => {
    await handleRentalTimeCommand(ctx);
  },
);

export default rentalByTimesCommand;
