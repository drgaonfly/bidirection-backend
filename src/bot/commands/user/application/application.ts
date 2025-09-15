import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { checkInBot } from '../../../../bot/middlewares/checkInBot';
import { IdGen } from '../../../../utils/idGen';
import { InlineKeyboard } from 'grammy';
import Application from '../../../../models/application';
import BotUser from '../../../../models/botUser';
import createDebug from 'debug';

const applicationCommand = new Composer<MyContext>();
const debug = createDebug('bot:application');

// 监听"代理申请"文本消息
export async function handleApplicationCommand(ctx: MyContext) {
  debug('代理申请命令被触发');

  const bot = ctx.currentBot;

  const botUser = ctx.currentBotUser;

  // 检查该用户是否已经在任何机器人中绑定了代理
  const existingBotUserWithProxy = await BotUser.findOne({
    id: botUser.id,
    bound_proxy: { $exists: true, $ne: null },
  }).populate('bound_proxy');

  if (existingBotUserWithProxy) {
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
        reply_markup: new InlineKeyboard()
          .url(
            '📞 联系客服',
            ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
          )
          .text('📊 获取代理账密', 'get_bot_proxy'),
      },
    );
    return;
  }

  // 检查该 Telegram 用户是否在任何机器人上都有待处理的申请
  // 首先找到该 Telegram 用户在所有机器人上的 BotUser 记录
  const allBotUsersForThisUser = await BotUser.find({ id: botUser.id });
  const allBotUserIds = allBotUsersForThisUser.map((bu) => bu._id);

  const existingPendingApplication = await Application.findOne({
    botUser: { $in: allBotUserIds },
    status: { $in: ['pending', 'processing'] },
  }).populate('bot');

  if (existingPendingApplication) {
    const botName =
      (existingPendingApplication.bot as any)?.botName || '其他机器人';
    await ctx.reply(
      `您已经在机器人 "${botName}" 上提交过代理申请了，请等待审核结果。\n\n一个用户只能同时有一个待处理的申请。`,
    );
    return;
  }

  // 检查当前机器人的申请状态
  const existApplication = await Application.findOne({
    bot: bot._id,
    botUser: botUser._id,
  });

  if (existApplication && ctx.currentBotUser.bound_proxy) {
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
        reply_markup: new InlineKeyboard()
          .url(
            '📞 联系客服',
            ctx.currentBot.customer_service_link || 'https://t.me/Net_8898',
          )
          .text('📊 获取代理账密', 'get_bot_proxy'),
      },
    );
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
