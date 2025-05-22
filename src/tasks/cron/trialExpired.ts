import BotUserConfig, { UserStatus } from '../../models/botUserConfig';
import { IBot } from '../../models/bot';
import { setupBot } from '../../bot/botSetup';
import { IBotUser } from '../../models/botUser';

export async function trialExpired() {
  try {
    // 查找所有试用期已过期的用户
    const expiredUsers = await BotUserConfig.find({
      status: UserStatus.TRIAL,
      trialEndDate: { $lte: new Date() },
    })
      .populate('bot')
      .populate('botUser');

    console.log(`找到 ${expiredUsers.length} 个试用过期用户`);

    // 更新这些用户的状态为试用过期并发送通知
    const updatePromises = expiredUsers.map(async (user) => {
      const botUser = user.botUser as IBotUser;
      const username =
        botUser.userName ||
        `${botUser.firstName || ''} ${botUser.lastName || ''}`.trim();
      console.log(
        `正在处理用户 ${username}, 原试用结束时间: ${user.trialEndDate}`,
      );

      const updatedUser = await BotUserConfig.findByIdAndUpdate(
        user._id,
        { status: UserStatus.TRIAL_EXPIRED },
        { new: true },
      );

      const bot = setupBot((user.bot as IBot).token);

      // 发送试用过期通知
      try {
        console.log(`向用户 ${username} 发送过期通知`);
        await bot.api.sendMessage(
          (user.botUser as IBotUser).id,
          '您的试用期已到期，请续费以继续使用服务。',
        );
      } catch (error) {
        console.error(`向用户 ${user._id} 发送过期通知失败:`, error);
      }

      return updatedUser;
    });

    const updatedUsers = await Promise.all(updatePromises);
    console.log(`成功更新 ${updatedUsers.length} 个用户状态为试用过期`);
  } catch (error) {
    console.error('处理试用过期用户时出错:', error);
  }
}
