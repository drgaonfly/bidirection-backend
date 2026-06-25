import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Bot from '../../../../models/bot';
import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
import { checkBotOwner } from '../../../middlewares/checkBotOwner';
import { checkInBot } from '../../../middlewares/checkInBot';
import { sendStatusCard } from './helpers';

const toggleCallback = new Composer<MyContext>();

toggleCallback.callbackQuery(
  'toggle_topic_mode',
  checkInBot,
  checkBotOwner,
  async (ctx) => {
    await ctx.answerCallbackQuery();

    if (ctx.currentBot?.isCreatedByAdmin) return;

    const fresh = await Bot.findById(ctx.currentBot._id);

    if (!fresh) return;

    const nextEnabled = !fresh.isTopicModeEnabled;

    if (nextEnabled) {
      // 首次开启时设置试用期开始时间
      if (!fresh.topicTrialStartedAt) {
        fresh.topicTrialStartedAt = new Date();
      }

      // 开启前：订阅必须有效（含试用期）
      if (!isTopicSubscriptionActive(fresh, ctx.currentProxyUser)) {
        await ctx.answerCallbackQuery({
          text: '⚠️ 订阅已到期或未开通，请先续费后再开启话题模式',
          show_alert: true,
        });
        return;
      }
    }

    fresh.isTopicModeEnabled = nextEnabled;
    await fresh.save();

    // 重新显示订阅状态卡片
    await sendStatusCard(ctx, true);

    await ctx.answerCallbackQuery({
      text: nextEnabled ? '✅ 话题模式已开启' : '✅ 话题模式已关闭',
    });
  },
);

export default toggleCallback;
