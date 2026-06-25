import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { startClientAndGetSession } from '../../../services/gramClient';
// import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
import { replaceVariables } from '../conversations/editMessage';
import createDebug from 'debug';

const startCommand = new Composer<MyContext>();

const debug = createDebug('bot:start');

// 开始命令处理
startCommand.command('start', async (ctx) => {
  debug('start');
  const bot = ctx.currentBot;

  const botSession = bot.session;

  debug('------------------session------------------');
  if (!botSession) {
    const session = await startClientAndGetSession(bot.token);
    debug('session', session);
    bot.session = session as any;
    await bot.save();
  }

  debug(ctx.chat);

  // 判断是否在群组中
  if (ctx.chat.type !== 'private') {
    // 检查机器人是否可以读取所有群组消息
    if (!ctx.me.can_read_all_group_messages) {
      await ctx.reply(
        '请关闭机器人隐私模式，否则无法正常工作。\n设置方法：联系 @BotFather，发送 /setprivacy，选择机器人，选择 Disable',
      );
      debug('需要关闭机器人隐私模式');
    }

    return;
  }

  // 广告位 ---- 平台机器人一定有发, 发给客户看
  if (ctx.currentProxyUser?.advertisement) {
    await ctx.reply(ctx.currentProxyUser.advertisement);
  }

  // 替换消息中的变量
  const message = replaceVariables(
    ctx.currentBot.message || '请开始与我通信',
    ctx,
  );

  // 构建按钮键盘
  let keyboard: InlineKeyboard | undefined;
  if (ctx.currentBot.buttons && ctx.currentBot.buttons.length > 0) {
    keyboard = new InlineKeyboard();
    ctx.currentBot.buttons.forEach((button: any) => {
      if (button.type === 'url') {
        keyboard.url(button.text, button.value || '');
      } else if (button.type === 'callback') {
        keyboard.text(button.text, button.value || '');
      } else if (button.type === 'alert') {
        keyboard.text(button.text, button.value || '');
      }
      keyboard.row();
    });
  }

  // 发送媒体（如果有）
  if (ctx.currentBot.medias && ctx.currentBot.medias.length > 0) {
    for (const media of ctx.currentBot.medias) {
      try {
        if (media.type === 'photo') {
          if (media.fileId) {
            await ctx.replyWithPhoto(media.fileId, {
              caption: message,
              reply_markup: keyboard,
            });
          } else if (media.url) {
            await ctx.replyWithPhoto(media.url, {
              caption: message,
              reply_markup: keyboard,
            });
          }
        } else if (media.type === 'video') {
          if (media.fileId) {
            await ctx.replyWithVideo(media.fileId, {
              caption: message,
              reply_markup: keyboard,
            });
          } else if (media.url) {
            await ctx.replyWithVideo(media.url, {
              caption: message,
              reply_markup: keyboard,
            });
          }
        } else if (media.type === 'document') {
          if (media.fileId) {
            await ctx.replyWithDocument(media.fileId, {
              caption: message,
              reply_markup: keyboard,
            });
          } else if (media.url) {
            await ctx.replyWithDocument(media.url, {
              caption: message,
              reply_markup: keyboard,
            });
          }
        }
      } catch (err: any) {
        debug('Failed to send media:', err.message);
      }
    }
    return;
  }

  // 没有媒体时发送纯文本消息
  if (ctx.currentBot.isCreatedByAdmin) {
    await ctx.reply(message, {
      reply_markup:
        keyboard || new InlineKeyboard().text('克隆', 'clone_start'),
    });
  } else if (
    ctx.currentBot?.owner?.toString() === String(ctx.currentBotUser._id)
  ) {
    // 从 ctx.currentBot 取订阅状态和话题开关（botResolver 已加载完整文档）
    // const hasActiveSubscription = isTopicSubscriptionActive(
    //   ctx.currentBot,
    //   ctx.currentProxyUser,
    // );
    const topicEnabled = ctx.currentBot.isTopicModeEnabled ?? false;

    const ownerKeyboard = new InlineKeyboard()
      .text('👋启动信息', `config_menu_${ctx.currentBot._id}`)
      .row()
      .text(
        topicEnabled ? '群组话题模式通信✅' : '群组话题模式通信❌',
        'subscribe',
      );

    await ctx.reply('等待有用户向您通信', { reply_markup: ownerKeyboard });
  } else {
    await ctx.reply(message, { reply_markup: keyboard });
  }
});

export default startCommand;
