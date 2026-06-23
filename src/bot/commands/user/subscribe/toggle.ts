import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';

const toggleCallback = new Composer<MyContext>();

toggleCallback.callbackQuery(
  'toggle_topic_mode',
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();

    if (ctx.chat?.type !== 'private') return;
    if (ctx.currentBot?.isCreatedByAdmin) return;

    const freshBot = await Bot.findById(ctx.currentBot._id).select(
      'isTopicModeEnabled activeTopicGroup topicSubscriptionExpiredAt createdAt',
    );
    if (!freshBot) return;

    const nextEnabled = !freshBot.isTopicModeEnabled;

    if (nextEnabled) {
      // 开启前：群组必须已配置
      if (!freshBot.activeTopicGroup) {
        await ctx.answerCallbackQuery({
          text: '⚠️ 请先完成话题群组配置，再开启话题模式',
          show_alert: true,
        });
        return;
      }
      // 开启前：订阅必须有效（含试用期）
      if (!isTopicSubscriptionActive(freshBot, ctx.currentProxyUser)) {
        await ctx.answerCallbackQuery({
          text: '⚠️ 订阅已到期或未开通，请先续费后再开启话题模式',
          show_alert: true,
        });
        return;
      }
    }

    freshBot.isTopicModeEnabled = nextEnabled;
    await freshBot.save();

    const statusText = nextEnabled ? '🟢 话题模式已开启' : '🔴 话题模式已关闭';

    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .text('编辑启动信息', `edit_message_${ctx.currentBot._id}`)
        .row()
        .text('订阅话题模式通信', 'subscribe')
        .text(statusText, 'toggle_topic_mode'),
    });

    await ctx.answerCallbackQuery({
      text: nextEnabled ? '✅ 话题模式已开启' : '✅ 话题模式已关闭',
    });
  },
);

export default toggleCallback;
