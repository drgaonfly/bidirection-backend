import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';
import { IdGen } from '../../../../utils/idGen';
import Application from '../../../../models/application';
import createDebug from 'debug';

const applicationCommand = new Composer<MyContext>();
const debug = createDebug('bot:application');

// 监听"代理申请"文本消息
export async function handleApplicationCommand(ctx: MyContext) {
  debug('代理申请命令被触发');

  const bot = ctx.currentBot;

  const botUser = ctx.currentBotUser;

  const existApplication = await Application.findOne({
    bot: bot._id,
    botUser: botUser._id,
  });

  if (ctx.currentBotUser.bound_proxy) {
    await ctx.reply('您已经是代理了, 无须再次申请');
    return;
  }

  if (existApplication) {
    await ctx.reply('您已经提交过代理申请了，请勿重复提交');
    return;
  }

  // 直接回复代理申请内容
  const application = new Application({
    id: await IdGen.next(Application, 'id', 6),
    bot: bot._id,
    botUser: botUser._id,
    status: 'pending',
  });

  await application.save();

  await ctx.reply(
    `代理申请已提交，请等待审核, 申请ID为 <code>${application.id}</code>`,
    {
      parse_mode: 'HTML',
    },
  );
}

applicationCommand.hears(/代理申请/, checkInBot, async (ctx) => {
  await handleApplicationCommand(ctx);
});

applicationCommand.callbackQuery('application', checkInBot, async (ctx) => {
  await handleApplicationCommand(ctx);
});

export default applicationCommand;
