import { TronWeb } from 'tronweb';
import { IWithdraw } from '../models/withdraw';
import { decrypt } from '../services/encrypt';

// 环境变量（实际应用中应使用环境变量）
const TRONGRID_API = 'https://api.trongrid.io';
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Tether USD (USDT) 主网合约地址

/**
 * 发送 USDT (TRC20) 到指定地址
 * @param toAddress 接收地址（Base58格式）
 * @param amount 发送的USDT数量（不是最小单位）
 * @returns 交易ID
 */

// 示例
// await sendUSDT(
//   "TABC1234接收方地址", // 接收方
//   5.5,                  // 5.5 USDT
//   "私钥xxxxxxxx"        // 发送方
// );

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

export async function sendUSDTByWithdraw(
  withdraw: IWithdraw,
  fromPrivateKey: string,
): Promise<string> {
  console.log('------ fromPrivateKey:', fromPrivateKey);

  if (withdraw.status === 'success') {
    console.log('------ 提现记录已提现成功');
    throw new Error('已经提现成功');
  }

  const toAddress = withdraw.address;
  const usdtAmount = withdraw.amount;

  const tronWeb = new TronWeb({
    fullHost: TRONGRID_API,
    privateKey: fromPrivateKey,
  });

  console.log('------ sendUSDT 开始 ------');
  if (!fromPrivateKey) {
    console.log('------ fromPrivateKey 为空:', fromPrivateKey);
    throw new Error('私钥不能为空');
  }

  const fromAddress = tronWeb.address.fromPrivateKey(decrypt(fromPrivateKey));
  console.log('------ fromAddress:', fromAddress);
  console.log('------ toAddress:', toAddress);
  console.log('------ usdtAmount:', usdtAmount);

  try {
    // 验证地址格式
    if (!tronWeb.isAddress(toAddress)) {
      console.log('------ toAddress 格式错误:', toAddress);
      throw new Error('Invalid TRON address format');
    }

    // 1. 创建合约实例
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);

    // 2. 检查USDT余额
    const balance = await contract.balanceOf(fromAddress).call();
    const balanceFormatted = Number(balance.toString()) / 1_000_000;
    console.log('------ USDT余额:', balanceFormatted);

    if (balanceFormatted < usdtAmount) {
      console.log('------ USDT 余额不足，无法转账');
      throw new Error('USDT 余额不足，无法转账');
    }

    // 3. 将金额转换为最小单位（USDT有6位小数）
    const amountInSun = tronWeb
      .toBigNumber(usdtAmount)
      .times(1000000)
      .toFixed(0);

    // 4. 调用合约的 transfer 方法
    console.log('------ 开始发送 USDT...');
    const transaction = await contract
      .transfer(
        toAddress, // 接收地址
        amountInSun, // 金额（最小单位）
      )
      .send();

    // 5. 等待交易确认
    const result = await transaction.wait();
    if (!result.receipt?.result) {
      throw new Error('Transaction failed: ' + JSON.stringify(result));
    }

    console.log('------ 发送交易成功:', result.id);

    // 6. 更新提现记录状态
    withdraw.hash = result.id;
    withdraw.status = 'success';
    await withdraw.save();

    return result.id;
  } catch (error) {
    console.error('------ 操作失败:', error.message);
    withdraw.status = 'failed';
    await withdraw.save();
    throw new Error('USDT提现失败: ' + error.message);
  }
}
