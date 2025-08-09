import { TronWeb } from 'tronweb';
import { getExchangeRate } from './getExchange';
import axios from 'axios';
import { getAdminUser } from './buyTelegramPremium';
import { decrypt } from '../services/encrypt';
import { IRental } from '../models/rental';
import UnRental from '../models/unrental';
import EnergySend from '../models/energySend';

const API_KEYS = [
  'cfb0c541-ae6c-4a66-a6d8-3c82e3a5be81',
  '4d4b343a-026b-4839-a15a-db80cf5f10d1',
  '2d17ab36-84d7-4135-bb03-662a46144370',
  '4413fdae-9b01-4f1d-9e43-64072593a19b',
  'dccb134b-d9c8-4e17-8e37-34b3a737bbe4',
  'a6db1a8d-6e77-4f94-823c-dfbd970a15cb',
  '0e1d03f1-0f0e-4dfc-862b-e7325d9173d1',
  '5cd34bde-4e8a-44de-a203-d6077cb20f5b',
];

// const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // 主网 USDT 合约

let lastUsedIndex = -1;

function getNextApiKey(): string {
  // 随机打乱 API_KEYS
  if (lastUsedIndex === -1) {
    for (let i = API_KEYS.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [API_KEYS[i], API_KEYS[j]] = [API_KEYS[j], API_KEYS[i]];
    }
  }
  console.log('API_KEYS', API_KEYS);
  lastUsedIndex = (lastUsedIndex + 1) % API_KEYS.length;
  return API_KEYS[lastUsedIndex];
}

async function fetchTrxTransactions(address: string, minutes = 1) {
  const now = Date.now();
  const startTimestamp = now - minutes * 60 * 1000; // 减去分钟换算成毫秒

  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions?start_timestamp=${startTimestamp}`;

  const key = getNextApiKey();

  const response = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      'TRON-PRO-API-KEY': key,
    },
  });

  return response.data;
}

async function fetchTrc20Transactions(address: string) {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`;

  const key = getNextApiKey();

  const response = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      'TRON-PRO-API-KEY': key,
    },
  });

  return response.data.data;
}

const getAccountBalances = async (accountId: string) => {
  const url = `https://api.trongrid.io/v1/accounts/${accountId}`;

  const key = getNextApiKey();

  // console.log('key key', key)

  try {
    const response = await axios.get(url, {
      headers: { 'TRON-PRO-API-KEY': key },
    });

    const data = response.data.data[0];

    // 获取 TRX 余额
    const trxBalance = data.balance;

    // 计算所有 TRC20 代币的总余额
    const usdtBalance = data.trc20.reduce(
      (total: number, token: { [key: string]: string }) => {
        // 对每个 TRC20 代币余额进行累加
        const tokenBalance = Object.values(token).reduce((sum, balance) => {
          const balanceInDecimals = parseInt(balance) / 10_00_00; // 假设每个代币的精度是6
          return sum + balanceInDecimals;
        }, 0);
        return total + tokenBalance;
      },
      0,
    );

    return {
      trxBalance,
      usdtBalance,
    };
  } catch (error) {
    console.error('Error fetching account balances:', error);
    throw error;
  }
};

// async function getAccountResources(address: string) {
//   try {
//     // 1. 获取基础账户信息
//     const account = await tronWeb.trx.getAccount(address);

//     // 2. 获取 TRX 余额
//     const trxBalance = tronWeb.fromSun(account.balance);

//     // 3. 获取 USDT 余额
//     const usdtBalance = await getTRC20Balance(address, USDT_CONTRACT);

//     return {
//       trxBalance,
//       usdtBalance,

//       accountInfo: account,
//     };
//   } catch (error) {
//     console.error('获取账户资源失败:', error);
//     throw error;
//   }
// }

// async function getTRC20Balance(
//   address: string,
//   contractAddress: string,
// ): Promise<string> {
//   try {
//     tronWeb.setAddress(address); // 设置默认地址
//     const contract = await tronWeb.contract().at(contractAddress);
//     const balanceRaw = await contract.balanceOf(address).call(); // balanceRaw 是 BigInt

//     const balanceNum = Number(balanceRaw); // 显式转换
//     return (balanceNum / 1e6).toFixed(6); // USDT 是 6 位精度
//   } catch (error) {
//     console.error('获取TRC20余额失败:', error);
//     return '0';
//   }
// }

async function rentEnergy(
  rental: IRental,
  toAddress: string,
  amount: number,
): Promise<any> {
  // Get admin user and use their energy_privateKey

  if (rental.status === 'completed') {
    console.log(`[rentEnergy]: ${rental._id} 租赁已完成，无需再次租赁]`);
    return;
  }

  console.log('[rentEnergy] 获取管理员信息...');
  const admin = await getAdminUser();

  // 解密 energy_privateKey
  console.log('[rentEnergy] 解密管理员 energy_privateKey...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb
  console.log('[rentEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const fromAddress = tronWeb.address.fromPrivateKey(
    decryptedPrivateKey,
  ) as string;

  console.log('[rentEnergy] 获取 fromAddress...', fromAddress);

  const es = await EnergySend.findOneAndUpdate(
    {
      tx_id: rental.tx_id,
    },
    {
      $set: {
        bot: rental.bot,
        botUser: rental.botUser,
        // proxy 字段可选，若 rental.proxy 存在则赋值
        ...(rental.proxy ? { proxy: rental.proxy } : {}),
        from_address: rental.energyFromAddress,
        to_address: rental.from_address,
        amount: amount,
        separation: rental.separation,
        price: rental.price,
        actual_price: rental.actual_price,
        limit_hour: rental.limit_hour,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  try {
    const amountSunStr = tronWeb.toSun(amount); // 返回 string
    const amountSun = Number(amountSunStr); // 转为 number

    // 打印详细日志
    console.log('[rentEnergy] 租赁能量参数:', {
      rentalId: rental?.id,
      fromAddress,
      toAddress,
      amount,
      amountSun,
      amountSunStr,
    });

    console.log('[rentEnergy] 构建 delegateResource 交易...');
    const transaction = await tronWeb.transactionBuilder.delegateResource(
      amountSun, // 第1个参数：租赁的TRX数量（以Sun为单位）
      toAddress, // 第2个参数：接收能量的地址（租给谁）
      'ENERGY', // 第3个参数：租赁的资源类型（能量）
      fromAddress as string, // 第4个参数：出租能量的地址（从谁那里租）
    );
    console.log('[rentEnergy] 构建交易完成:', transaction);

    console.log('[rentEnergy] 签名交易...');
    const signedTx = await tronWeb.trx.sign(transaction);
    console.log('[rentEnergy] 签名交易完成:', signedTx);

    console.log('[rentEnergy] 发送交易...');
    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    console.log('[rentEnergy] 发送交易结果:', result);

    rental.tx_id = result.txid;
    rental.transactionAt = new Date();
    rental.endAt = new Date(
      rental.transactionAt.getTime() + rental.limit_hour * 60 * 60 * 1000,
    );
    rental.energyFromAddress = fromAddress as string;
    rental.status = 'completed';
    await rental.save();
    console.log('[rentEnergy] 租赁记录已保存:', {
      rentalId: rental?.id,
      tx_id: rental.tx_id,
      status: rental.status,
    });

    es.status = 'success';
    es.tx_id = result.txid;
    await es.save();

    return result.txid;
  } catch (error) {
    console.error('[rentEnergy] 租赁能量失败:', error);
    rental.status = 'failed';
    rental.energyFromAddress = fromAddress as string;
    await rental.save();
    console.log('[rentEnergy] 租赁失败，已更新状态为 failed:', {
      rentalId: rental?.id,
    });

    es.status = 'failed';
    await es.save();

    throw error;
  }
}

async function unRentEnergy(rental: IRental): Promise<any> {
  console.log('[unRentEnergy] 开始处理能量回收, rentalId:', rental?._id);

  const existUnRental = await UnRental.findOne({ rental: rental._id });

  if (existUnRental) {
    console.log(
      '[unRentEnergy] ------ 已存在能量回收记录 hash:',
      existUnRental.hash,
    );
    throw new Error(`---- 已存在能量回收记录 hash:', ${existUnRental.hash}`);
  }

  if (rental.status === 'recycled') {
    console.log('[unRentEnergy] ------ 当前状态是 recycled:', rental.status);
    throw new Error(`---- 当前echange记录的状态已回收:', ${rental.status}`);
  }

  // 获取管理员用户
  console.log('[unRentEnergy] 获取管理员用户...');
  const admin = await getAdminUser();

  // 解密私钥
  console.log('[unRentEnergy] 解密管理员能量私钥...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb
  console.log('[unRentEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const fromAddress = tronWeb.address.fromPrivateKey(
    decryptedPrivateKey,
  ) as string;
  console.log('[unRentEnergy] 管理员地址:', fromAddress);

  const unRental = await UnRental.findOneAndUpdate(
    {
      rental,
    },
    {
      $set: {
        from: fromAddress,
        to: rental.from_address,
        separation: rental.separation,
        amount: rental.amount,
        limit_hour: rental.limit_hour,
        price: rental.price,
        actual_price: rental.actual_price,
        txid: rental.tx_id,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );
  console.log('[unRentEnergy] UnRental 记录已创建/更新:', unRental?._id);

  try {
    const amountSunStr = tronWeb.toSun(rental.amount); // 转为Sun单位字符串
    const amountSun = Number(amountSunStr);
    console.log(
      '[unRentEnergy] 解除租赁 amount:',
      rental.amount,
      'Sun:',
      amountSun,
    );

    // 创建解除租赁交易
    console.log('[unRentEnergy] 创建解除租赁交易...');
    const transaction = await tronWeb.transactionBuilder.undelegateResource(
      amountSun, // 解除租赁的能量数量（Sun单位）
      rental.from_address, // 被解除租赁的用户地址
      'ENERGY', // 资源类型，固定为 'ENERGY'
      fromAddress, // 管理员（发起解除租赁）的地址
    );
    console.log('[unRentEnergy] 解除租赁交易已构建:', transaction);

    // 签名交易
    console.log('[unRentEnergy] 签名交易...');
    const signedTx = await tronWeb.trx.sign(transaction);
    console.log('[unRentEnergy] 签名交易完成:', signedTx);

    // 发送交易
    console.log('[unRentEnergy] 发送交易...');
    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    console.log('[unRentEnergy] 发送交易结果:', result);

    unRental.status = 'success';
    unRental.hash = result.txid;
    await unRental.save();
    console.log(
      '[unRentEnergy] UnRental 状态已更新为 success, hash:',
      result.txid,
    );

    rental.status = 'recycled';
    await rental.save();
    console.log(
      '[unRentEnergy] Rental 状态已更新为 recycled, rentalId:',
      rental?._id,
    );

    return result.txid;
  } catch (error) {
    console.error('[unRentEnergy] 解除租赁能量失败:', error);

    unRental.status = 'failed';
    await unRental.save();
    console.log(
      '[unRentEnergy] UnRental 状态已更新为 failed, unRentalId:',
      unRental?._id,
    );

    throw error;
  }
}

export {
  fetchTrxTransactions,
  fetchTrc20Transactions,
  getAccountBalances,
  rentEnergy,
  unRentEnergy,
};
