import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import Bot, { IBot } from '../../../../models/bot';
import createDebug from 'debug';

const editMessageComposer = new Composer<MyContext>();
const debug = createDebug('bot:editMessage');

const TIMEOUT = 5 * 60 * 1000; // 5 分钟超时

async function editMessageConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot }: { bot: IBot },
) {
  debug('Starting editMessage conversation');

  const result = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    { maxMilliseconds: TIMEOUT },
  );

  if (result.callbackQuery?.data === 'close') {
    await ctx.reply('已取消编辑');
    return;
  }

  const newMessage = result.message?.text;

  if (!newMessage || newMessage.trim() === '') {
    await ctx.reply('❌ 消息内容不能为空，请重新输入', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await editMessageConversation(conversation, ctx, { bot });
  }

  await Bot.findByIdAndUpdate(bot._id, { message: newMessage });

  debug('Bot message updated:', newMessage);
  await ctx.reply(`✅ 启动信息已更新为：\n\n${newMessage}`);
}

editMessageComposer.use(createConversation(editMessageConversation));

// 响应 start.ts 里的 edit_message_<botId> 回调
editMessageComposer.callbackQuery(/^edit_message_/, async (ctx) => {
  debug('edit_message callback triggered');

  await ctx.reply(
    ['请输入新的启动信息', '', '⏳ 此操作将在 5 分钟后过期'].join('\n'),
    {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    },
  );

  await ctx.conversation.exitAll();

  await ctx.conversation.enter('editMessageConversation', {
    bot: ctx.currentBot,
  });
});

export default editMessageComposer;
