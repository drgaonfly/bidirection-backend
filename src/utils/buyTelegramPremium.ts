import axios from 'axios';
import { IPremium } from '../models/premium';
import { getAdminUser } from './getAdminUser';
// import { decrypt } from '../services/encrypt';
// import { sendTON } from './sendTON';

export async function buyTelegramPremium(order: IPremium): Promise<boolean> {
  const adminUser = await getAdminUser();

  const fragment_hash = adminUser.fragment_hash;
  const fragment_cookie = adminUser.fragment_cookie;

  if (!fragment_hash || !fragment_cookie) {
    console.warn('Fragment hash or cookie is not set');

    return false;
  }

  // const processed_mnemonic = decrypt(adminUser.mnemonic);

  // Fragment API headers
  const headers = {
    Cookie: fragment_cookie,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  try {
    console.warn('开始处理Premium订单:', order.id);

    const searchResult_url = `https://fragment.com/api?hash=${fragment_hash}&query=${order.userName}&months=${order.months}&method=searchPremiumGiftRecipient`;

    const searchResponse = await axios.post(
      searchResult_url,
      {},
      {
        headers: headers,
      },
    );
    const searchResult = searchResponse.data;
    console.warn('searchResult response', searchResponse);

    if (!searchResult.ok) {
      console.warn('搜索失败:', searchResult);
      order.status = 'failed';
      await order.save();
      return false;
    }

    const initResult_url = `https://fragment.com/api?hash=${fragment_hash}&recipient=${searchResult.found.recipient}&months=${order.months}&method=initGiftPremiumRequest`;

    const initResponse = await axios.post(
      initResult_url,
      {},
      { headers: headers },
    );
    const initResult = initResponse.data;
    console.warn('initResult response', initResponse);

    if (!initResult.req_id) {
      console.warn('初始化失败:', initResult);
      return false;
    }

    const linkResult_url = `https://fragment.com/api?hash=${fragment_hash}&id=${initResult.req_id}&show_sender=1&method=getGiftPremiumLink`;

    const linkResponse = await axios.post(
      linkResult_url,
      {},
      { headers: headers },
    );
    const linkResult = linkResponse.data;
    console.warn('linkResult response', linkResponse);

    if (!linkResult.ok) {
      console.warn('获取链接失败:', linkResult);
      return false;
    }

    const getPaymentAddress_url = `https://fragment.com/tonkeeper/rawRequest?id=${linkResult.check_params.id}&qr=1`;

    const getPaymentAddressResult = await axios.get(getPaymentAddress_url);

    if (getPaymentAddressResult.data.body.params.response_options.broadcast) {
      order.receiving_address =
        getPaymentAddressResult.data.body.params.message.address;
      order.receiving_amount =
        getPaymentAddressResult.data.body.params.message.amount;
      order.payload = getPaymentAddressResult.data.body.params.message.payload;
      await order.save();

      console.log('order saved', order);

      // sendTON
      // await sendTON(order, processed_mnemonic);
    }

    return false;
  } catch (error) {
    console.warn('处理异常:', order.id, error.message);
    return false;
  }
}
