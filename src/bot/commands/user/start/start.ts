import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { startClientAndGetSession } from '../../../services/gramClient';
import { checkPermission } from '../../../middlewares/checkPermission';
import Bot from '../../../../models/bot';
import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
import createDebug from 'debug';

const startCommand = new Composer<MyContext>();

const debug = createDebug('bot:start');

// 开始命令处理
startCommand.command('start', checkPermission, async (ctx) => {
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

  if (ctx.currentBot.isCreatedByAdmin) {
    await ctx.reply(bot.message || '欢迎使用机器人', {
      reply_markup: new InlineKeyboard().text('克隆', 'clone_start'),
    });
  } else if (
    ctx.currentBot.owner.toString() === String(ctx.currentBotUser._id)
  ) {
    // 从 DB 取最新的订阅状态和话题开关
    const freshBot = await Bot.findById(ctx.currentBot._id)
      .select('isTopicModeEnabled topicSubscriptionExpiredAt')
      .lean();
    const hasActiveSubscription = isTopicSubscriptionActive(freshBot);
    const topicEnabled = freshBot?.isTopicModeEnabled ?? false;

    const keyboard = new InlineKeyboard()
      .text('编辑启动信息', `edit_message_${ctx.currentBot._id}`)
      .row()
      .text('订阅话题模式通信', 'subscribe');

    // 只有订阅有效时才显示话题模式开关
    if (hasActiveSubscription) {
      keyboard.text(
        topicEnabled ? '🟢 话题模式已开启' : '🔴 话题模式已关闭',
        'toggle_topic_mode',
      );
    }

    await ctx.reply('等待有用户向您通信', { reply_markup: keyboard });
  } else {
    await ctx.reply(ctx.currentBot.message || '请开始与我通信');
  }
});

export default startCommand;
