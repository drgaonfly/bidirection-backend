import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';
import { IdGen } from '../../../../utils/idGen';
import { InlineKeyboard } from 'grammy';
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
    await ctx.reply(
      [
        '<b>您已经是代理了, 无须再次申请</b>',
        '',
        '💎 <b>零成本 · 副业新风口！</b>',
        '<b>TRX能量代理上线啦</b> 🚀',
        '',
        '✅ 客户下单，你直接赚钱',
        '✅ 下级代理裂变，持续分润',
        '✅ 不投一分钱，轻松开启被动收入模式',
        '✅ 📈 收益无上限，长期可持续',
        '',
        '👉 现在加入 = 提前锁定长期收益！',
        '👉 动动手指，分享给身边用波场的朋友，就能开始赚钱！',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().url(
          '📞 联系客服',
          ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
        ),
      },
    );
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
    [
      `代理申请已提交，请等待审核, 申请ID为 <code>${application.id}</code>`,
      '',
      '💎 零成本 · 副业新风口！',
      'TRX能量代理上线啦 🚀',
      '',
      '✅ 客户下单，你直接赚钱',
      '✅ 下级代理裂变，持续分润',
      '✅ 不投一分钱，轻松开启被动收入模式',
      '✅ 📈 收益无上限，长期可持续',
      '',
      '👉 现在加入 = 提前锁定长期收益！',
      '👉 动动手指，分享给身边用波场的朋友，就能开始赚钱！',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().url(
        '📞 联系客服',
        ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
      ),
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
