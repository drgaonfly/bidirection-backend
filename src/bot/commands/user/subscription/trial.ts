import { Composer } from 'grammy';
import { MyContext } from '../../../types';
// import { useTrial } from '../../../../utils/useEjsMessage';
import createDebug from 'debug';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';
import { UserStatus } from '../../../../models/botUserConfig';

const trialCommand = new Composer<MyContext>();
const debug = createDebug('bot:trial');

// 监听"试用"文本消息
trialCommand.hears(/申请试用/, checkInBot, async (ctx) => {
  debug('试用命令被触发');

  const botUserConfig = ctx.currentBotUserConfig;

  // 检查用户是否已经在试用中或已订阅
  if (
    botUserConfig.status === UserStatus.TRIAL ||
    botUserConfig.status === UserStatus.AUTHORIZED
  ) {
    await ctx.reply('您已经在使用中，无需重复申请试用');
    return;
  }

  // 检查用户是否已经试用过且试用已过期
  if (botUserConfig.status === UserStatus.TRIAL_EXPIRED) {
    const expiredDate = botUserConfig.trialEndDate
      ?.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/\//g, '-');

    await ctx.reply(
      `您的试用已于 ${expiredDate} 过期，请订阅后继续使用我们的服务。`,
    );
    return;
  }

  // 设置试用状态和过期时间
  const trialEndDate = new Date();
  trialEndDate.setHours(trialEndDate.getHours() + 12); // 设置12小时后过期

  botUserConfig.status = UserStatus.TRIAL;
  botUserConfig.trialEndDate = trialEndDate;

  // 保存更新后的配置
  await botUserConfig.save();

  // 构建回复消息
  const message =
    `恭喜您获得12小时免费试用！\n\n` +
    `试用开始时间：${new Date().toLocaleString()}\n` +
    `试用结束时间：${trialEndDate.toLocaleString()}\n\n` +
    `请在试用期间体验我们的服务。如果您对服务满意，可以随时订阅以继续使用。`;

  // 直接回复试用链接
  await ctx.reply(message, {
    parse_mode: 'HTML',
  });
});

export default trialCommand;
