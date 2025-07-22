import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import createDebug from 'debug';

const advanceComposer = new Composer<MyContext>();
const debug = createDebug('bot:wallet:click');

// const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout

// const cancelKeyboard = new InlineKeyboard().text('❌ 取消', 'close');

async function enter(conversation: Conversation<MyContext>, ctx: MyContext) {
  debug('Starting wallet remark edit conversation');

  // Ask for new remark
  if (ctx.currentBotUserConfig.interger < ctx.currentBot.min_interger_limit) {
    await ctx.reply('积分不足, 不能使用预支功能');

    return;
  }
}

advanceComposer.use(createConversation(enter));

advanceComposer.callbackQuery('advance:confirm', async (ctx) => {
  // 这里可以处理用户点击“预支能量”按钮后的逻辑
  await ctx.answerCallbackQuery();
  await ctx.reply('您已选择预支能量，后续操作请根据提示进行。');

  await ctx.conversation.enter('advance');
});

export default advanceComposer;
