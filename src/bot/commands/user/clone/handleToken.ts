import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { createBotWithUser } from '../../../../utils/createBotWithUser';
import { checkBotPublic } from '../../../middlewares/checkBotPublic';
import createDebug from 'debug';

const debug = createDebug('bot:clone:handleToken');
const handleTokenComposer = new Composer<MyContext>();

/**
 * 监听私聊中直接发送的 Bot Token，自动触发克隆流程。
 * 仅在 public bot 下生效，custom bot（克隆产物）不允许再次克隆。
 */
handleTokenComposer.hears(
  /^\d{8,}:[A-Za-z0-9_-]{35,}$/,
  checkBotPublic,
  async (ctx) => {
    const token = ctx.message.text?.trim() ?? '';
    const bot = ctx.currentBot;
    const botUser = ctx.currentBotUser;

    debug('收到用户直接发送的 token，开始克隆');

    await ctx.reply('✅ 已收到您的机器人Token，正在为您处理，请稍候...');

    let result;
    try {
      result = await createBotWithUser(token, bot, botUser);
    } catch (e: any) {
      debug('createBotWithUser 异常:', e);
      await ctx.reply(`❌ 克隆失败：${e.message || '未知错误'}`);
      return;
    }

    if (result.success) {
      const { userName, trialDays } = result.account!;

      const lines = ['✅ <b>你的专属双向机器人创建成功！</b>', ''];
      if (trialDays > 0) {
        lines.push(
          `🎉 已赠送 <b>${trialDays} 天</b>高级功能试用时间，可以用于群组话题通讯模式，请尽快使用！`,
        );
        lines.push('');
      }
      lines.push(
        `您的机器人：@${userName}`,
        '',
        '🤖 机器人正在初始化，稍后即可正常使用。',
      );

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ 克隆失败：${result.message || '请稍后再试'}`);
    }
  },
);

export default handleTokenComposer;
