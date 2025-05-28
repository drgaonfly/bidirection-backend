import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import { useSubscriptionHistory } from '../../../../utils/useEjsMessage';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';

const subscriptionHistoryCallback = new Composer<MyContext>();
const debug = createDebug('bot:subscription-history');

// 处理订单历史记录回调
subscriptionHistoryCallback.callbackQuery(
  'subscription_history',
  async (ctx) => {
    debug('用户中心命令被触发');
    await handleSubscriptionHistoryCallback(ctx);
  },
);

subscriptionHistoryCallback.command(
  'subscription_history',
  checkInBot,
  async (ctx) => {
    debug('用户中心命令被触发');
    await handleSubscriptionHistoryCallback(ctx);
  },
);

async function handleSubscriptionHistoryCallback(ctx: MyContext) {
  debug('订单历史记录回调被触发');

  // 只保留属于当前 bot 的订阅
  const subscriptions = ctx.currentBotUser.subscriptions.filter(
    (sub) => sub.bot.toString() === ctx.currentBot._id.toString(),
  );

  // 使用EJS模板渲染订阅历史记录
  const renderSubscriptionHistory = useSubscriptionHistory();
  const message = await renderSubscriptionHistory({ subscriptions });

  // 发送消息
  await ctx.reply(message, { parse_mode: 'HTML' });
  // 只有是回调查询时才调用 answerCallbackQuery
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
}

export default subscriptionHistoryCallback;
