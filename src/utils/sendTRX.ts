import Transfer from '../models/transfer';
import { IExchange } from '../models/exchange';
import { TronWeb } from 'tronweb';

const TRONGRID_API = 'https://api.trongrid.io';
// const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // 主网 USDT 合约

/**
 * 查询当前地址的 USDT 余额，并发送 TRX 到指定地址
 * @param fromPrivateKey 发起方私钥
 * @param toAddress TRX接收地址
 * @param trxAmount 发送的 TRX 数量
 */
export async function sendTRX(
  exchange: IExchange,
  fromPrivateKey: string,
  toAddress: string,
  trxAmount: number,
  hash?: string,
): Promise<string> {
  console.log('------ fromPrivateKey:', fromPrivateKey);

  const existTrxRecord = await Transfer.findOne({
    hash: hash,
  });

  if (existTrxRecord) {
    console.log('------ 已存在兑换记录 hash:', existTrxRecord.hash);
    throw new Error(`---- 已存在兑换记录 hash:', ${existTrxRecord.hash}`);
  }

  if (exchange.status === 'completed') {
    console.log('------ 当前状态是 completed:', exchange.status);
    throw new Error(`---- 当前echange记录的状态已完成:', ${exchange.status}`);
  }

  const tronWeb = new TronWeb({
    fullHost: TRONGRID_API,
    privateKey: fromPrivateKey,
  });

  console.log('------ sendTRX 开始 ------');
  if (!fromPrivateKey) {
    console.log('------ fromPrivateKey 为空:', fromPrivateKey);
    throw new Error('私钥不能为空');
  }

  const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);
  console.log('------ fromAddress:', fromAddress);
  console.log('------ toAddress:', toAddress);
  console.log('------ trxAmount:', trxAmount);

  const transfer = await Transfer.findOneAndUpdate(
    {
      exchange,
    },
    {
      $set: {
        from: fromAddress,
        to: toAddress,
        hash: hash,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  try {
    // 验证地址格式
    if (!tronWeb.isAddress(toAddress)) {
      console.log('------ toAddress 格式错误:', toAddress);
      throw new Error('Invalid TRON address');
    }

    // 1. 检查是否收到 USDT
    // const usdtContract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    // const usdtBalance = await usdtContract.balanceOf(fromAddress).call();
    // const usdtBalanceFormatted = Number(usdtBalance.toString()) / 1_000_000;

    // console.log('------ USDT余额:', usdtBalanceFormatted);

    // if (usdtBalanceFormatted === 0) {
    //   console.log('------ 未收到 USDT，无法进行 TRX 转账');
    //   throw new Error('未收到 USDT，无法进行 TRX 转账');
    // }

    // 2. 确保有足够 TRX 发起交易
    const trxBalance = await tronWeb.trx.getBalance(fromAddress);
    console.log('------ TRX余额:', trxBalance / 1_000_000);

    if (trxBalance < trxAmount * 1_000_000) {
      console.log('------ TRX 余额不足，无法转账');
      throw new Error('TRX 余额不足，无法转账');
    }

    // 3. 发送 TRX
    console.log('------ 开始发送 TRX...');
    // 确保金额为整数（单位为 sun），避免浮点数精度问题
    const amountInSun = Math.round(trxAmount * 1_000_000);
    if (!Number.isInteger(amountInSun) || amountInSun <= 0) {
      throw new Error('Invalid amount provided');
    }
    const tx = await tronWeb.trx.sendTransaction(toAddress, amountInSun);

    console.log('------ 发送交易成功:', tx.txid);

    transfer.txid = tx.txid;
    transfer.trxAmount = trxAmount;
    transfer.status = 'completed';

    await transfer.save();

    return tx.txid;
  } catch (error) {
    console.error('------ 操作失败:', error.message);

    transfer.status = 'failed';
    await transfer.save();

    throw new Error('接收 USDT 后发送 TRX 失败: ' + error.message);
  }
}
