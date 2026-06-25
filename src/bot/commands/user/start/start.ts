import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { startClientAndGetSession } from '../../../services/gramClient';
import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
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

  // 广告位 ---- 平台机器人一定有发, 发给客户看 ， 客户 (owner) 克隆的机器人可以选发，发给它的用户看
  // 1. 收集可能存在的广告内容（自动忽略 undefined/null）
  const ads = [
    ctx.currentProxyUser?.advertisement,
    ctx.currentBot?.advertisement,
  ].filter(Boolean); // 关键：这一步会过滤掉所有空字符串、undefined 和 null

  // 2. 只有当真正有广告内容时，才用换行符拼接并发送
  if (ads.length > 0) {
    await ctx.reply(ads.join('\n\n')); // 用双换行 \n\n 视觉效果通常更好
  }

  if (ctx.currentBot.isCreatedByAdmin) {
    await ctx.reply(bot.message || '欢迎使用机器人', {
      reply_markup: new InlineKeyboard().text('克隆', 'clone_start'),
    });
  } else if (
    ctx.currentBot.owner.toString() === String(ctx.currentBotUser._id)
  ) {
    // 从 ctx.currentBot 取订阅状态和话题开关（botResolver 已加载完整文档）
    const hasActiveSubscription = isTopicSubscriptionActive(
      ctx.currentBot,
      ctx.currentProxyUser,
    );
    const topicEnabled = ctx.currentBot.isTopicModeEnabled ?? false;

    const keyboard = new InlineKeyboard()
      .text('编辑启动信息', `edit_message_${ctx.currentBot._id}`)
      // .text('编辑广告', `edit_advertisement_${ctx.currentBot._id}`)
      // .row()
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
