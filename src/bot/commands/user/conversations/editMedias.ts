import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot, { IBot } from '../../../../models/bot';
import createDebug from 'debug';

const editMediasComposer = new Composer<MyContext>();
const debug = createDebug('bot:editMedias');

const TIMEOUT = 5 * 60 * 1000; // 5 分钟超时

async function editMediasConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot }: { bot: IBot },
) {
  debug('Starting editMedias conversation');

  // 显示当前媒体
  if (bot.medias && bot.medias.length > 0) {
    let mediaList = '当前媒体文件：\n';
    bot.medias.forEach((media: any, index: number) => {
      const typeText =
        media.type === 'photo'
          ? '图片'
          : media.type === 'video'
            ? '视频'
            : '文档';
      mediaList += `${index + 1}. [${typeText}]\n`;
    });
    await ctx.reply(mediaList);
  } else {
    await ctx.reply('当前没有媒体文件');
  }

  await ctx.reply('请发送图片、视频或文档文件：', {
    reply_markup: new InlineKeyboard()
      .text('🗑️ 清空所有媒体', 'media_clear')
      .row()
      .text('❌ 取消', 'close'),
  });

  const result = await conversation.waitFor(
    [
      'message:photo',
      'message:video',
      'message:document',
      'callback_query:data',
    ],
    { maxMilliseconds: TIMEOUT },
  );

  if (result.callbackQuery?.data === 'close') {
    await ctx.reply('已取消编辑');
    return;
  }

  if (result.callbackQuery?.data === 'media_clear') {
    await Bot.findByIdAndUpdate(bot._id, { medias: [] });
    await ctx.reply('✅ 已清空所有媒体');
    return;
  }

  const msg = result.message;
  let newMedia: any = {};

  if (msg.photo) {
    // 获取最大尺寸的图片
    const photo = msg.photo[msg.photo.length - 1];
    newMedia = { type: 'photo', fileId: photo.file_id };
  } else if (msg.video) {
    newMedia = { type: 'video', fileId: msg.video.file_id };
  } else if (msg.document) {
    newMedia = { type: 'document', fileId: msg.document.file_id };
  } else {
    await ctx.reply('❌ 不支持的文件类型，请发送图片、视频或文档', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await editMediasConversation(conversation, ctx, { bot });
  }

  // 添加到 medias 数组
  const updatedMedias = [...(bot.medias || []), newMedia];
  await Bot.findByIdAndUpdate(bot._id, { medias: updatedMedias });

  const typeText =
    newMedia.type === 'photo'
      ? '图片'
      : newMedia.type === 'video'
        ? '视频'
        : '文档';
  debug('Bot medias updated:', newMedia);
  await ctx.reply(`✅ 媒体已添加：[${typeText}]`);

  // 询问是否继续添加
  await ctx.reply('是否继续添加媒体？', {
    reply_markup: new InlineKeyboard()
      .text('✅ 继续添加', 'media_continue')
      .text('❌ 完成', 'close'),
  });

  const continueResult = await conversation.waitFor('callback_query:data', {
    maxMilliseconds: TIMEOUT,
  });

  if (continueResult.callbackQuery?.data === 'media_continue') {
    // 重新加载最新的 bot 数据
    const freshBot = await Bot.findById(bot._id);
    if (freshBot) {
      return await editMediasConversation(conversation, ctx, { bot: freshBot });
    }
  }
}

editMediasComposer.use(createConversation(editMediasConversation));

// 响应 config_menu 里的 edit_medias_list 回调
editMediasComposer.callbackQuery(
  'edit_medias_list',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('edit_medias_list callback triggered');

    await ctx.conversation.exitAll();

    await ctx.conversation.enter('editMediasConversation', {
      bot: ctx.currentBot,
    });
  },
);

export default editMediasComposer;
