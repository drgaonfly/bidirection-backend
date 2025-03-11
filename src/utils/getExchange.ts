import axios from 'axios';

export function getExchangeRate(
  cryptoType1: string,
  cryptoType2: string,
): Promise<number> {
  return axios({
    url: `https://www.okx.com/api/v5/market/ticker?instId=${cryptoType1}-${cryptoType2}`,
    method: 'GET',
  })
    .then((response) => {
      if (response.data.code === '0' && response.data.data.length > 0) {
        return parseFloat(response.data.data[0].last);
      }
      throw new Error(
        `Failed to fetch ${cryptoType1}-${cryptoType2} exchange rate from OKX`,
      );
    })
    .catch((error) => {
      console.error('Exchange rate fetch error:', error);
      throw new Error(`获取 ${cryptoType1}-${cryptoType2} 汇率失败`);
    });
}
