import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createConversation, Conversation } from '@grammyjs/conversations';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { InlineKeyboard } from 'grammy';
import Bot, { IBot } from '../../../../models/bot';
import createDebug from 'debug';

const editButtonsComposer = new Composer<MyContext>();
const debug = createDebug('bot:editButtons');

const TIMEOUT = 5 * 60 * 1000; // 5 分钟超时

async function editButtonsConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  { bot }: { bot: IBot },
) {
  debug('Starting editButtons conversation');

  // 显示当前按钮
  if (bot.buttons && bot.buttons.length > 0) {
    let buttonList = '当前按钮配置：\n';
    bot.buttons.forEach((button: any, index: number) => {
      const typeText =
        button.type === 'url'
          ? '链接'
          : button.type === 'callback'
            ? '回调'
            : '弹窗';
      const valueText = button.value ? ` (${button.value})` : '';
      buttonList += `${index + 1}. [${typeText}] ${button.text}${valueText}\n`;
    });
    await ctx.reply(buttonList);
  } else {
    await ctx.reply('当前没有配置按钮');
  }

  await ctx.reply('请选择要添加的按钮类型：', {
    reply_markup: new InlineKeyboard()
      .text('🔗 链接按钮', 'btn_type_url')
      .text('🔘 回调按钮', 'btn_type_callback')
      .row()
      .text('💬 弹窗按钮', 'btn_type_alert')
      .row()
      .text('🗑️ 清空所有按钮', 'btn_clear')
      .row()
      .text('❌ 取消', 'close'),
  });

  const result = await conversation.waitFor('callback_query:data', {
    maxMilliseconds: TIMEOUT,
  });

  if (result.callbackQuery?.data === 'close') {
    await ctx.reply('已取消编辑');
    return;
  }

  if (result.callbackQuery?.data === 'btn_clear') {
    await Bot.findByIdAndUpdate(bot._id, { buttons: [] });
    await ctx.reply('✅ 已清空所有按钮');
    return;
  }

  let buttonType: string = '';
  if (result.callbackQuery?.data === 'btn_type_url') {
    buttonType = 'url';
  } else if (result.callbackQuery?.data === 'btn_type_callback') {
    buttonType = 'callback';
  } else if (result.callbackQuery?.data === 'btn_type_alert') {
    buttonType = 'alert';
  } else {
    return;
  }

  await ctx.reply('请输入按钮文本：', {
    reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
  });

  const textResult = await conversation.waitFor(
    ['message:text', 'callback_query:data'],
    { maxMilliseconds: TIMEOUT },
  );

  if (textResult.callbackQuery?.data === 'close') {
    await ctx.reply('已取消编辑');
    return;
  }

  const buttonText = textResult.message?.text?.trim();
  if (!buttonText) {
    await ctx.reply('❌ 按钮文本不能为空', {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });
    return await editButtonsConversation(conversation, ctx, { bot });
  }

  // 如果是链接或回调按钮，需要输入值
  let buttonValue: string | undefined;
  if (buttonType === 'url' || buttonType === 'callback') {
    const prompt =
      buttonType === 'url' ? '请输入链接 URL：' : '请输入回调数据：';
    await ctx.reply(prompt, {
      reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
    });

    const valueResult = await conversation.waitFor(
      ['message:text', 'callback_query:data'],
      { maxMilliseconds: TIMEOUT },
    );

    if (valueResult.callbackQuery?.data === 'close') {
      await ctx.reply('已取消编辑');
      return;
    }

    buttonValue = valueResult.message?.text?.trim();
    if (!buttonValue) {
      await ctx.reply('❌ 值不能为空', {
        reply_markup: new InlineKeyboard().text('❌ 取消', 'close'),
      });
      return await editButtonsConversation(conversation, ctx, { bot });
    }
  }

  const newButton: any = { type: buttonType, text: buttonText };
  if (buttonValue) {
    newButton.value = buttonValue;
  }
  if (buttonType === 'alert') {
    newButton.showAlert = true;
  }

  // 添加到 buttons 数组
  const updatedButtons = [...(bot.buttons || []), newButton];
  await Bot.findByIdAndUpdate(bot._id, { buttons: updatedButtons });

  const typeText =
    buttonType === 'url' ? '链接' : buttonType === 'callback' ? '回调' : '弹窗';
  debug('Bot buttons updated:', newButton);
  await ctx.reply(`✅ 按钮已添加：[${typeText}] ${buttonText}`);

  // 询问是否继续添加
  await ctx.reply('是否继续添加按钮？', {
    reply_markup: new InlineKeyboard()
      .text('✅ 继续添加', 'btn_continue')
      .text('❌ 完成', 'close'),
  });

  const continueResult = await conversation.waitFor('callback_query:data', {
    maxMilliseconds: TIMEOUT,
  });

  if (continueResult.callbackQuery?.data === 'btn_continue') {
    // 重新加载最新的 bot 数据
    const freshBot = await Bot.findById(bot._id);
    if (freshBot) {
      return await editButtonsConversation(conversation, ctx, {
        bot: freshBot,
      });
    }
  }
}

editButtonsComposer.use(createConversation(editButtonsConversation));

// 响应 config_menu 里的 edit_buttons_list 回调
editButtonsComposer.callbackQuery(
  'edit_buttons_list',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    debug('edit_buttons_list callback triggered');

    await ctx.conversation.exitAll();

    await ctx.conversation.enter('editButtonsConversation', {
      bot: ctx.currentBot,
    });
  },
);

export default editButtonsComposer;
