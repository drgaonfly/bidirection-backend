import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import { useUserProfile } from '../../../../utils/useEjsMessage';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';

const userProfileCommand = new Composer<MyContext>();
const debug = createDebug('bot:user-profile');

// 监听"用户中心"文本消息
userProfileCommand.hears(/个人信息/, checkInBot, async (ctx) => {
  debug('用户中心命令被触发');

  // 查找用户信息
  const botUser = ctx.currentBotUser;

  // 格式化注册日期
  const registerDate = botUser.createdAt.toISOString().split('T')[0];

  // 渲染用户资料模板
  const renderUserProfile = useUserProfile();

  const message = await renderUserProfile({
    userId: botUser.id,
    userName: botUser.userName,
    nickname: `${botUser.firstName || ''} ${botUser.lastName || ''}`.trim(),
    registerDate,
    totalPurchase: 0,
    currentBalance: ctx.currentBotUserConfig.balance,
  });
  // 添加联系客服按钮，使用url参数直接跳转到客服链接
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '💰 立即充值',
            callback_data: 'recharge',
          },
          {
            text: '🔄 自助续费',
            callback_data: 'auto_renew',
          },
        ],
        [
          {
            text: '❌ 关闭',
            callback_data: 'close',
          },
          {
            text: '📞 联系客服',
            url: ctx.currentBot.customer_service_link || 'https://t.me/example',
          },
        ],
      ],
    },
  });
});

export default userProfileCommand;
