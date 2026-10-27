import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../../types';
import { startClientAndGetSession } from '../../../services/gramClient';
import { isTopicSubscriptionActive } from '../../../middlewares/checkTopicSubscription';
import { htmlToTelegramHtml } from '../../../../utils/handleHtmlToTelegramHtml';
import { replaceVariables } from '../conversations/editMessage';
import createDebug from 'debug';

const startCommand = new Composer<MyContext>();

const debug = createDebug('bot:start');

// 开始命令处理
startCommand.command('start', async (ctx) => {
  debug('start');
  const bot = ctx.currentBot;

  const botSession = bot.session;

  debug('------------------session------------------');
  if (!botSession) {
    const session = await startClientAndGetSession(bot.token);
    debug('session', session);
    bot.session = session as any;
    await bot.save();
  }

  debug(ctx.chat);

  // 判断是否在群组中
  if (ctx.chat.type !== 'private') {
    // 检查机器人是否可以读取所有群组消息
    if (!ctx.me.can_read_all_group_messages) {
      await ctx.reply(
        '请关闭机器人隐私模式，否则无法正常工作。\n设置方法：联系 @BotFather，发送 /setprivacy，选择机器人，选择 Disable',
      );
      debug('需要关闭机器人隐私模式');
    }

    return;
  }

  // 母机器人 start（isCreatedByAdmin）
  if (ctx.currentBot.isCreatedByAdmin) {
    const message = replaceVariables(
      ctx.currentBot.message || '请开始与我通信',
      ctx,
    );
    const cloneMessage = [
      message,
      '',
      '🤖 直接发送机器人 API Token 即可克隆同款机器人，',
      '或点击下方按钮一键创建。',
      '',
      `<a href="https://t.me/XRService1">虾仁双向机器人使用教程</a>`,
    ].join('\n');

    await ctx.reply(cloneMessage, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().url(
        '🤖 克隆专属机器人',
        `https://t.me/newbot/${bot.userName}`,
      ),
    });
    return;
  }

  // Owner start：直接返回配置菜单
  if (ctx.currentBot?.owner?.toString() === String(ctx.currentBotUser._id)) {
    const topicEnabled =
      (ctx.currentBot.isTopicModeEnabled ?? false) &&
      isTopicSubscriptionActive(
        ctx.currentBot,
        undefined,
        ctx.currentProxyUser,
      );

    const miniAppUrl = `${process.env.WEBHOOK_URL}/mini-app/bot-config.html?botId=${ctx.currentBot._id}`;

    const ownerKeyboard = new InlineKeyboard()
      .webApp('⚙️ 编辑机器人', miniAppUrl)
      .row()
      .text(
        topicEnabled ? '群组话题模式通信✅' : '群组话题模式通信❌',
        'subscribe',
      );

    await ctx.reply(
      '<a href="https://t.me/XRService1">虾仁双向机器人使用教程</a>',
      {
        parse_mode: 'HTML',
        reply_markup: ownerKeyboard,
      },
    );
    return;
  }

  // 普通用户 start：广告位 + 启动信息

  // 广告位：仅向订阅未激活的用户发送
  const isSubscribed = isTopicSubscriptionActive(
    ctx.currentBot,
    undefined,
    ctx.currentProxyUser,
  );
  if (ctx.currentProxyUser?.advertisement && !isSubscribed) {
    const adText = htmlToTelegramHtml(ctx.currentProxyUser.advertisement);
    if (adText) {
      await ctx.reply(adText, { parse_mode: 'HTML' });
    }
  }

  // 替换消息中的变量
  const message = replaceVariables(
    ctx.currentBot.message || '请开始与我通信',
    ctx,
  );

  // 构建按钮键盘
  let keyboard: InlineKeyboard | undefined;
  if (ctx.currentBot.buttons && ctx.currentBot.buttons.length > 0) {
    const validButtons = ctx.currentBot.buttons.filter((b: any) =>
      ['url', 'callback', 'copy'].includes(b.type),
    );

    if (validButtons.length > 0) {
      const rowMap = new Map<number, typeof validButtons>();
      for (const btn of validButtons) {
        const r = (btn as any).row ?? 1;
        if (!rowMap.has(r)) rowMap.set(r, []);
        rowMap.get(r)!.push(btn);
      }
      const sortedRows = [...rowMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, btns]) => btns);

      keyboard = new InlineKeyboard();
      sortedRows.forEach((row, rowIndex) => {
        row.forEach((button: any) => {
          if (button.type === 'url') {
            keyboard!.url(button.text, button.value || '');
          } else if (button.type === 'copy') {
            keyboard!.copyText(button.text, button.value || '');
          } else {
            keyboard!.text(button.text, button.value || '');
          }
        });
        if (rowIndex < sortedRows.length - 1) {
          keyboard!.row();
        }
      });
    }
  }

  // 发送媒体
  if (ctx.currentBot.medias && ctx.currentBot.medias.length > 0) {
    for (const media of ctx.currentBot.medias) {
      try {
        if (media.type === 'photo') {
          if (media.fileId) {
            await ctx.replyWithPhoto(media.fileId);
          } else if (media.url) {
            await ctx.replyWithPhoto(media.url);
          }
        } else if (media.type === 'video') {
          if (media.fileId) {
            await ctx.replyWithVideo(media.fileId);
          } else if (media.url) {
            await ctx.replyWithVideo(media.url);
          }
        } else if (media.type === 'document') {
          if (media.fileId) {
            await ctx.replyWithDocument(media.fileId);
          } else if (media.url) {
            await ctx.replyWithDocument(media.url);
          }
        }
      } catch (err: any) {
        debug('Failed to send media:', err.message);
      }
    }
  }

  // 发送文本消息 + 按钮
  await ctx.reply(message, { reply_markup: keyboard });
});

export default startCommand;
