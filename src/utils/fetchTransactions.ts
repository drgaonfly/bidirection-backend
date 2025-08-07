import { TronWeb } from 'tronweb';
import { getExchangeRate } from './getExchange';
import axios from 'axios';
import { getAdminUser } from './buyTelegramPremium';
import { decrypt } from '../services/encrypt';
import { IRental } from '../models/rental';

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

async function fetchTrxTransactions(address: string) {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions`;

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
  fromAddress: string,
  toAddress: string,
  amount: number,
  cryptoType: 'trx' | 'usdt',
): Promise<any> {
  // Get admin user and use their energy_privateKey
  const admin = await getAdminUser();

  // 解密 energy_privateKey
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const USDT_TO_TRX_RATIO = 1 / (await getExchangeRate('TRX', 'USDT'));

  try {
    let amountTRX: number;

    if (cryptoType === 'trx') {
      amountTRX = amount;
    } else if (cryptoType === 'usdt') {
      amountTRX = amount * USDT_TO_TRX_RATIO;
    } else {
      throw new Error(`不支持的币种类型: ${cryptoType}`);
    }

    const amountSunStr = tronWeb.toSun(amountTRX); // 返回 string
    const amountSun = Number(amountSunStr); // 转为 number

    const transaction = await tronWeb.transactionBuilder.delegateResource(
      amountSun,
      toAddress,
      'ENERGY',
      fromAddress,
    );

    const signedTx = await tronWeb.trx.sign(transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    rental.tx_id = result.txid;
    rental.status = 'completed';
    await rental.save();

    return result.txid;
  } catch (error) {
    console.error('租赁能量失败:', error);
    rental.status = 'failed';
    await rental.save();
    throw error;
  }
}

export {
  fetchTrxTransactions,
  fetchTrc20Transactions,
  getAccountBalances,
  rentEnergy,
};
