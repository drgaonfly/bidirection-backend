import { TronWeb } from 'tronweb';

// 环境变量（实际应用中应使用环境变量）
const TRONGRID_API = 'https://api.trongrid.io';
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Tether USD (USDT) 主网合约地址

export async function sendUSDT(
  toAddress: string,
  amount: number,
  fromPrivateKey: string,
): Promise<string> {
  // 初始化 TronWeb
  const tronWeb = new TronWeb({
    fullHost: TRONGRID_API,
    privateKey: fromPrivateKey,
  });

  try {
    // 验证地址格式
    if (!tronWeb.isAddress(toAddress)) {
      throw new Error('Invalid TRON address format');
    }

    // 确保金额有效
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // 1. 创建合约实例
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);

    // 2. 将金额转换为最小单位（USDT有6位小数）
    const amountInSun = tronWeb.toBigNumber(amount).times(1000000).toFixed(0);

    // 3. 调用合约的 transfer 方法
    const transaction = await contract
      .transfer(
        toAddress, // 接收地址
        amountInSun, // 金额（最小单位）
      )
      .send();

    // 4. 等待交易确认（可选）
    const result = await transaction.wait();
    if (!result.receipt?.result) {
      throw new Error('Transaction failed: ' + JSON.stringify(result));
    }

    return result.id;
  } catch (error) {
    console.error('USDT转账失败:', error.message);
    throw new Error(`发送USDT失败: ${error.message}`);
  }
}
