import axios from 'axios';
import { TronWeb } from 'tronweb';

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

async function fetchTrc20Transactions(address: string, minutes = 1) {
  const start_time = Math.floor(
    (new Date().getTime() - minutes * 60 * 1000) / 1000,
  ); // 转换为秒

  const end_time = Math.floor(new Date().getTime() / 1000); // 当前时间的秒级时间戳

  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?start=${start_time}&end=${end_time}`;

  const key = getNextApiKey();

  const response = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      'TRON-PRO-API-KEY': key,
    },
  });

  return response.data.data;
}

async function fetchEnergyContractCalls(address: string, minutes = 1) {
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

  const transactions = response.data.data || [];

  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
  });

  function decodeTrc20Transfer(data: string) {
    if (data.startsWith('0x')) data = data.slice(2);

    // 方法ID校验
    const method = data.slice(0, 8);
    if (method !== 'a9059cbb') throw new Error('Not a transfer method');

    // 地址
    const toHex = '41' + data.slice(24, 64); // 取32字节的最后20字节，加41前缀
    const toAddress = tronWeb.address.fromHex(toHex);

    // value
    const valueHex = data.slice(72, 136);
    const value = BigInt('0x' + valueHex);

    return { to: toAddress, amount: Number(value) / 10 ** 6 }; // 这里是最小单位
  }

  // 只筛选出该地址发出的调用合约交易
  const outgoingContractCalls = transactions.filter((tx: any) => {
    const contractType = tx.raw_data?.contract?.[0]?.type;
    const owner = tronWeb.address.fromHex(
      tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address,
    );

    return (
      contractType === 'TriggerSmartContract' &&
      owner?.toLowerCase() === address.toLowerCase() // 转出
    );
  });

  // 带上能量消耗信息
  return outgoingContractCalls.map((tx: any) => ({
    txID: tx.txID,
    block: tx.blockNumber,
    timestamp: tx.block_timestamp,
    owner: tronWeb.address.fromHex(
      tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address,
    ),
    contract: tronWeb.address.fromHex(
      tx.raw_data?.contract?.[0]?.parameter?.value?.contract_address,
    ),
    call_value: tx.raw_data?.contract?.[0]?.parameter?.value?.call_value || 0,
    energy_usage: tx.energy_usage_total || 0,
    bandwidth_usage: tx.net_usage || 0,
    energy_fee: tx.energy_fee || 0,
    bandwidth_fee: tx.net_fee || 0,
    data: decodeTrc20Transfer(
      tx.raw_data?.contract?.[0]?.parameter?.value?.data,
    ),
  }));
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

export {
  fetchTrxTransactions,
  fetchTrc20Transactions,
  fetchEnergyContractCalls,
  getAccountBalances,
};
