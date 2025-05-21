import BotUser, { IBotUser, UserStatus } from '../../models/botUser';
// import { IBot } from '../../models/bot';
// import { setupBot } from '../../bot/botSetup';

export async function checkExpiredTrialUsers() {
  try {
    // 查询已过期但仍在试用状态的用户
    const expiredTrialUsers = (await BotUser.find({
      status: UserStatus.TRIAL,
      trialEndDate: { $lte: new Date() },
    })) as IBotUser[];

    for (const user of expiredTrialUsers) {
      // 更新用户状态为试用过期
      user.status = UserStatus.TRIAL_EXPIRED;
      await user.save();

      // 获取关联的bot实例并发送通知
      // const dbBot = user.bot as IBot;
      // if (dbBot?.token) {
      //   const bot = setupBot(dbBot.token);

      //   await bot.api.sendMessage(
      //     user.id,
      //     `⌛ 您的试用期已结束。\n` +
      //     `如需继续使用请订阅会员`,
      //   );
      // }

      console.log(`用户 ${user.id} 的试用期已过期`);
    }

    return { processed: expiredTrialUsers.length };
  } catch (error) {
    console.error('处理试用过期用户时出错:', error);
    return { error: error.message };
  }
}
