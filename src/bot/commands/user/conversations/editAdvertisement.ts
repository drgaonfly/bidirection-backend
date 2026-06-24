import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot, { IBot } from '../../../../models/bot';
import createDebug from 'debug';

const editAdvertisementComposer = new Composer<MyContext>();
const debug = createDebug('bot:editAdvertisement');

const TIMEOUT = 5 * 60 * 1000; // 5 分钟超时

async function editAdvertisementConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot }: { bot: IBot },
) {
  debug('Starting editAdvertisement conversation');

  const result = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    { maxMilliseconds: TIMEOUT },
  );

  if (result.callbackQuery?.data === 'close') {
    await ctx.reply('已取消编辑');
    return;
  }

  const newAdvertisement = result.message?.text;

  if (!newAdvertisement || newAdvertisement.trim() === '') {
    await ctx.reply('❌ 广告内容不能为空，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await editAdvertisementConversation(conversation, ctx, { bot });
  }

  await Bot.findByIdAndUpdate(bot._id, { advertisement: newAdvertisement });

  debug('Bot advertisement updated:', newAdvertisement);
  await ctx.reply(`✅ 广告信息已更新为：\n\n${newAdvertisement}`);
}

editAdvertisementComposer.use(
  createConversation(editAdvertisementConversation),
);

// 响应 start.ts 里的 edit_advertisement_<botId> 回调
editAdvertisementComposer.callbackQuery(
  /^edit_advertisement_/,
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('edit_advertisement callback triggered');

    await ctx.reply(
      ['请输入新的广告信息', '', '⏳ 此操作将在 5 分钟后过期'].join('\n'),
      {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      },
    );

    await ctx.conversation.exitAll();

    await ctx.conversation.enter('editAdvertisementConversation', {
      bot: ctx.currentBot,
    });
  },
);

export default editAdvertisementComposer;
