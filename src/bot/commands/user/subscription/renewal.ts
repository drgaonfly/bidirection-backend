import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import renewal from '../../../menus/inline/renewal';
import { useRenewal } from '../../../../utils/useEjsMessage';
import createDebug from 'debug';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';
// import Subscription, {
//   SubscriptionPlan,
//   SubscriptionStatus,
// } from '../../../../models/subscription';

const renewalCommand = new Composer<MyContext>();
const debug = createDebug('bot:renewal');

// 处理续费消息的函数
export const handleRenewalMessage = async (ctx: MyContext) => {
  const renderRenewal = useRenewal();
  const message = await renderRenewal();
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: renewal,
  });
};

// 监听"自助续费"文本消息
renewalCommand.hears(/自助续费/, checkInBot, async (ctx) => {
  debug('续费命令被触发');
  await handleRenewalMessage(ctx);
});

export default renewalCommand;
