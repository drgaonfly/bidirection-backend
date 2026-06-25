import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot, { IBot } from '../../../../models/bot';
import createDebug from 'debug';

const editMessageComposer = new Composer<MyContext>();
const debug = createDebug('bot:editMessage');

const TIMEOUT = 5 * 60 * 1000; // 5 分钟超时

/** 替换消息中的变量 */
export function replaceVariables(message: string, ctx: MyContext): string {
  const user = ctx.from;
  if (!user) return message;

  let result = message;
  result = result.replace(/%firstname%/gi, user.first_name || '');
  result = result.replace(/%lastname%/gi, user.last_name || '');
  result = result.replace(/%username%/gi, user.username || '');
  result = result.replace(/%userid%/gi, String(user.id));
  result = result.replace(
    /%fullname%/gi,
    `${user.first_name || ''} ${user.last_name || ''}`.trim(),
  );

  return result;
}

async function editMessageConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot }: { bot: IBot },
) {
  debug('Starting editMessage conversation');

  await ctx.reply(
    [
      '请输入新的启动信息',
      '',
      '支持的变量：',
      '%firstname% - 用户名',
      '%lastname% - 姓',
      '%username% - 用户名（@开头）',
      '%userid% - 用户ID',
      '%fullname% - 全名',
      '',
      '⏳ 此操作将在 5 分钟后过期',
    ].join('\n'),
    {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    },
  );

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

// 响应 config_menu 里的 edit_message_text 回调
editMessageComposer.callbackQuery(
  'edit_message_text',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('edit_message_text callback triggered');

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
  },
);

export default editMessageComposer;
