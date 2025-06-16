import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { handleWalletListWithoutInlineMenu } from './handleWalletList';

const walletShowComposer = new Composer<MyContext>();

walletShowComposer.hears(/^🏦 地址监听$/, async (ctx) => {
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '➕ 添加地址', callback_data: 'wallet_add_address' },
        { text: '⚙️ 设置地址', callback_data: 'wallet_set_address' },
        { text: '🗑 删除地址', callback_data: 'wallet_delete_address' },
      ],
      [{ text: '❌ 取消', callback_data: 'close' }],
    ],
  };

  const { replyText } = await handleWalletListWithoutInlineMenu(1);

  await ctx.reply(replyText, {
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard,
  });
});

export default walletShowComposer;
