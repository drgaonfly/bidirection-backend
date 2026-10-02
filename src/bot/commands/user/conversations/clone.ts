import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';

const debug = createDebug('bot:clone');
const cloneConversationComposer = new Composer<MyContext>();

/**
 * clone_start 按钮：发送克隆流程说明。
 * 用户只需将从 BotFather 获取到的 token 直接发送给本机器人，
 * handleToken 中间件会自动识别并完成克隆。
 */
cloneConversationComposer.callbackQuery('clone_start', async (ctx) => {
  debug('clone_start clicked');

  await ctx.reply(
    [
      '🤖 <b>克隆机器人流程</b>',
      '',
      '1. 打开 <b>@BotFather</b>',
      '2. 发送 <code>/newbot</code>',
      '3. 按指引设置机器人名字（可中文）',
      '4. 设置机器人 <b>username</b>（英文+数字，需以 <code>bot</code> 结尾）',
      '5. 创建完成后将注册好的 <b>token</b> 直接发送给我',
      '',
      'token格式示例：',
      '<code>6422100000:AAFMTBWko3t7gA3mN5SRYp5FuYcxxxxxxxxx</code>',
    ].join('\n'),
    { parse_mode: 'HTML' },
  );

  await ctx.answerCallbackQuery();
});

export default cloneConversationComposer;
