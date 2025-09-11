import axios from 'axios';
import BotUser from '../models/botUser';
import { IPremium } from '../models/premium';

/**
 * 赠送Telegram Premium订阅
 * @param userId - 接收者的用户ID
 * @param monthCount - 月数（3、6或12）
 * @param starCount - 订阅所需的星星数量（3个月1000颗，6个月1500颗，12个月2500颗）
 * @param text - 可选的附带文本（0-128个字符）
 * @param textParseMode - 可选的文本解析模式（如粗体、斜体）
 * @param textEntities - 可选的消息格式化特殊实体数组
 * @returns Promise<boolean> - 如果赠送成功返回true，失败返回false
 */

export async function buyTelegramPremium(order: IPremium): Promise<boolean> {
  const userId = await BotUser.findById(order.botUser);
  const monthCount = order.months;
  const starCount = monthCount === 3 ? 1000 : monthCount === 6 ? 1500 : 2500;

  // 验证月数和星星数量参数
  if (![3, 6, 12].includes(monthCount)) {
    console.error('无效的月数。应该是3、6或12。');
    return false;
  }

  if (![1000, 1500, 2500].includes(starCount)) {
    console.error(
      '无效的星星数量。3个月应该是1000颗，6个月应该是1500颗，12个月应该是2500颗。',
    );
    return false;
  }

  try {
    // 准备订阅数据
    const data = {
      user_id: userId,
      month_count: monthCount,
      star_count: starCount,
    };

    // 向Telegram Premium赠送服务发送模拟API请求
    const response = await axios.post(
      `https://api.telegram.org/bot<${process.env.SUPER_ADMIN_BOT_TOKEN}>/giftPremiumSubscription`,
      data,
    );

    if (response.data.ok) {
      console.log(`成功为用户 ${userId} 赠送了 ${monthCount} 个月的Premium`);

      order.status = 'success';
      await order.save();

      return true;
    } else {
      console.error(
        `为用户 ${userId} 赠送Telegram Premium失败: ${response.data.error}`,
      );

      order.status = 'failed';
      await order.save();

      return false;
    }
  } catch (error) {
    console.error('赠送Telegram Premium订阅时发生错误:', error);
    return false;
  }
}
