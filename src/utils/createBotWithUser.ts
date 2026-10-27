import { Bot as GrammyBot } from 'grammy';
import Bot, { IBot } from '../models/bot';
import { IBotUser } from '../models/botUser';
import User from '../models/user';
import { setWebhook } from '../controllers/botController';
import { clearBotCache } from '../controllers/botWebhookController';
import createDebug from 'debug';

const debug = createDebug('bot:createBotWithUser');

/**
 * 克隆一个新 Bot：保存记录、绑定 owner、设置 webhook。
 *
 * @param token      新机器人的 Telegram Bot Token
 * @param currentBot 母机器人（克隆来源）
 * @param botUser    操作者的 BotUser，自动成为新 bot 的 owner
 */
export async function createBotWithUser(
  token: string,
  currentBot: IBot | null,
  botUser: IBotUser | null,
): Promise<{
  success: boolean;
  message?: string;
  account?: { userName: string; trialDays: number };
}> {
  try {
    debug('[createBotWithUser] token:', token);

    // 1. 检查 token 是否已被占用
    const botExists = await Bot.findOne({ token });
    if (botExists) {
      return {
        success: false,
        message: '该 Bot Token 已被使用，请使用其他 Token',
      };
    }

    // 2. 用 Grammy 调 Telegram API 获取机器人基本信息
    let botInfo: { id?: string; username?: string; firstName?: string } | null =
      null;
    try {
      const tempBot = new GrammyBot(token);
      const me = await tempBot.api.getMe();
      botInfo = {
        id: String(me.id),
        username: me.username || '',
        firstName: me.first_name || '',
      };
      debug('[createBotWithUser] 获取机器人信息:', botInfo);
    } catch (e) {
      debug('[createBotWithUser] 获取机器人信息失败，继续创建:', e);
    }

    // 3. 检查是否存在同 username 的旧机器人（用户在 BotFather 重置了 token）
    //    直接更新旧机器人的 token 和基本信息，原有订阅/配置数据全部保留
    if (botInfo?.username) {
      const oldBot = await Bot.findOne({ userName: botInfo.username });
      if (oldBot) {
        debug(
          '[createBotWithUser] 发现同 username 旧机器人，更新 token:',
          oldBot._id,
        );
        oldBot.token = token;
        if (botInfo.id) oldBot.id = botInfo.id;
        if (botInfo.firstName) oldBot.botName = botInfo.firstName;
        await oldBot.save();

        // 清除旧缓存，确保下次 webhook 使用新 token 的实例
        clearBotCache(String(oldBot._id));

        setWebhook(oldBot).catch((e: any) => {
          debug('[createBotWithUser] 旧机器人重设 webhook 失败:', e?.message);
        });

        const proxyUser = await User.findById(oldBot.user)
          .select('topic_mode_trial_period')
          .lean();

        const trialDays = proxyUser?.topic_mode_trial_period ?? 0;

        return {
          success: true,
          account: { userName: oldBot.userName, trialDays },
        };
      }
    }

    // 4. 创建新 Bot，类型固定为 custom（克隆产物）
    const newBot = new Bot({
      token,
      clonedFrom: currentBot?._id ?? null,
      owner: botUser?._id ?? null,
      botUsers: botUser ? [botUser._id] : [],
      user: botUser?.proxy ?? null,
      isOnline: true,
      isCreatedByAdmin: false,
      type: 'custom',
      // topicTrialStartedAt 不在创建时赋值，等用户主动开启试用时再设置
      ...(botInfo && {
        id: botInfo.id || '',
        userName: botInfo.username || '',
        botName: botInfo.firstName || botInfo.username || '',
      }),
    });
    await newBot.save();
    debug('[createBotWithUser] 新 Bot 已保存:', newBot._id);

    // 4. 设置 Webhook（异步，不阻塞回复）
    setWebhook(newBot).catch((e: any) => {
      debug('[createBotWithUser] setWebhook 失败:', e?.message);
    });

    // 5. 读取试用天数，用于告知调用方
    const proxyUser = newBot.user
      ? await User.findById(newBot.user)
          .select('topic_mode_trial_period')
          .lean()
      : null;
    const trialDays = proxyUser?.topic_mode_trial_period ?? 0;

    return {
      success: true,
      account: { userName: newBot.userName, trialDays },
    };
  } catch (e: any) {
    debug('[createBotWithUser] 异常:', e);
    return { success: false, message: e?.message || '创建机器人失败' };
  }
}
