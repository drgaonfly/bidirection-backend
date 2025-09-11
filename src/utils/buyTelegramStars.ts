import axios from 'axios';
import TgStarOrder from '../models/star';

/**
 * 调用 Telegram Stars API 给用户充值
 * @param botToken - 机器人的 token
 * @param userId - Telegram 用户 ID
 * @param orderId - 我们系统的订单 ID
 * @param stars - 要充值的星星数量
 */
export async function buyTgStars(
  botToken: string,
  userId: number,
  orderId: number,
  stars: number,
) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendStars`;

    const response = await axios.post(url, {
      user_id: userId,
      stars: stars,
    });

    const data = response.data;

    if (!data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    // 更新订单状态
    await TgStarOrder.findOneAndUpdate(
      { id: orderId },
      {
        $set: {
          status: 'success',
          tx_id: data.result.transaction_id,
          stars: stars,
        },
      },
    );

    console.log(
      `[buyTgStars] 订单 ${orderId} 充值 ${stars} 星星成功, tx_id=${data.result.transaction_id}`,
    );

    return data.result;
  } catch (err) {
    console.error(`[buyTgStars] 订单 ${orderId} 充值失败:`, err.message);
    throw err;
  }
}
