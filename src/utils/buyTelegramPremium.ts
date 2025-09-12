import axios from 'axios';
import { IPremium } from '../models/premium';

async function callFragmentAPI(data: any): Promise<any> {
  const response = await axios.post(
    `https://fragment.com/api?hash=${process.env.PREMIUM_COOKIE}`,
    data,
  );

  console.warn('response', response);

  return response.data;
}

export async function buyTelegramPremium(order: IPremium): Promise<boolean> {
  try {
    console.warn('开始处理Premium订单:', order.id);

    const searchRecipientData = {
      query: order.userName || 'DracoFlying',
      months: order.months,
      method: 'searchPremiumGiftRecipient',
    };

    console.warn('搜索接收者:', searchRecipientData);
    const searchResult = await callFragmentAPI(searchRecipientData);

    if (!searchResult.ok) {
      console.warn('搜索失败:', searchResult);
      order.status = 'failed';
      await order.save();
      return false;
    }

    const initRequestData = {
      recipient: searchResult.found.recipient,
      months: order.months,
      method: 'initGiftPremiumRequest',
    };

    console.warn('初始化请求:', initRequestData);
    const initResult = await callFragmentAPI(initRequestData);

    if (!initResult.ok) {
      console.warn('初始化失败:', initResult);
      return false;
    }

    const getLinkData = {
      id: initResult.req_id,
      show_sender: 1,
      method: 'getGiftPremiumLink',
    };

    console.warn('获取链接:', getLinkData);
    const linkResult = await callFragmentAPI(getLinkData);

    if (linkResult.body.params.response_options.broadcast) {
      console.warn('订阅成功:', order.id);
      order.status = 'success';
      order.isPurchased = true;
      order.callback_url = linkResult.body.params.response_options.callback_url;
      await order.save();
      return true;
    }

    console.warn('订阅失败:', order.id);
    return false;
  } catch (error) {
    console.warn('处理异常:', order.id, error.message);
    return false;
  }
}
