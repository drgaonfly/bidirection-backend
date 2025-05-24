import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import Subscription from '../../../../models/subscription';
import createDebug from 'debug';
import { useSubscriptionHistory } from '../../../../utils/useEjsMessage';

const subscriptionHistoryCallback = new Composer<MyContext>();
const debug = createDebug('bot:subscription-history');

// 处理订单历史记录回调
subscriptionHistoryCallback.callbackQuery(
  'subscription_history',
  async (ctx) => {
    debug('订单历史记录回调被触发');

    // const subs = ctx.currentBotUser.subscriptions;

    const subs = await Subscription.find({
      botUser: '68218512ca3fc50b90089ac4',
    });

    // 使用EJS模板渲染订阅历史记录
    const renderSubscriptionHistory = useSubscriptionHistory();
    const message = await renderSubscriptionHistory({ subscriptions: subs });

    // 发送消息
    await ctx.reply(message, { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery();
  },
);

export default subscriptionHistoryCallback;
