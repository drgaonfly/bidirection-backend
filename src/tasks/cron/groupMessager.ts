import GroupMessage from '../../models/groupMessage';
import { IBot } from '../../models/bot';
import { IGroup } from '../../models/group';
import { setupBot } from '../../bot/botSetup';

/**
 * 群发消息任务
 */
export async function sendGroupMessages() {
  try {
    console.log('[sendGroupMessages] 开始处理群发消息...');

    // 查询所有需要发送的群发消息
    const groupMessages = await GroupMessage.find({
      isRealtime: true, // 只处理实时发送的消息
    })
      .populate('bot')
      .populate('groups');

    console.log(
      `[sendGroupMessages] 查询到 ${groupMessages.length} 条群发消息`,
    );

    for (const message of groupMessages) {
      const bot = message.bot as IBot;
      const groups = message.groups as IGroup[];

      if (!groups || groups.length === 0) {
        console.warn(
          `[sendGroupMessages] 消息 ${message._id} 没有关联的群组，跳过`,
        );
        continue;
      }

      // 设置机器人
      const telegramBot = setupBot(bot.token);

      // 向每个群组发送消息
      for (const group of groups) {
        try {
          // 发送消息前先验证群组
          await telegramBot.api.getChat(group.id);

          // 如果成功，才发送消息
          if (message.image) {
            // 发送带图片的消息
            await telegramBot.api.sendPhoto(
              group.id,
              `${process.env.BACKEND_URL}/api/static/${message.image}`,
              {
                caption: message.content,
                parse_mode: 'HTML',
              },
            );
          } else {
            // 发送纯文本消息
            await telegramBot.api.sendMessage(group.id, message.content, {
              parse_mode: 'HTML',
            });
          }
          console.log(`[sendGroupMessages] 已向群组 ${group.id} 发送消息`);
        } catch (error) {
          console.log(`群组 ${group.id} 不存在或机器人未加入，标记为无效`);
          // 可以更新数据库，标记此群组为无效
        }
      }

      console.log(
        `[sendGroupMessages] 消息 ${message._id} 已发送到 ${groups.length} 个群组`,
      );
    }

    console.log('[sendGroupMessages] 群发消息处理完成');
  } catch (error) {
    console.error('[sendGroupMessages] 处理群发消息时出错:', error);
  }
}
