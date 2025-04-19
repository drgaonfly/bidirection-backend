import { createPublicClient, http, formatEther } from 'viem';
import { mainnet, bsc } from 'viem/chains';
import { TronWeb } from 'tronweb';
import { log } from 'console';

// 预加载客户端
export const ethClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum.publicnode.com'),
});

export const bscClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org'),
});

// 初始化TronWeb客户端
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  // headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY },
});

// 获取ETH余额
export const fetchEthBalance = async (address: string): Promise<string> => {
  if (!address) {
    throw new Error('缺少钱包地址');
  }

  try {
    const balance = await ethClient.getBalance({
      address: address as `0x${string}`,
    });

    // ETH是18位小数
    let ethBalance = formatEther(balance);
    // 格式化为6位小数
    ethBalance = parseFloat(ethBalance).toFixed(6);

    console.log('ETH余额:', ethBalance);
    return ethBalance;
  } catch (error) {
    console.error('ETH余额获取失败:', error);
    throw new Error('获取ETH余额失败');
  }
};

// 获取BNB余额
export const fetchBnbBalance = async (address: string): Promise<string> => {
  if (!address) {
    throw new Error('缺少钱包地址');
  }

  try {
    const balance = await bscClient.getBalance({
      address: address as `0x${string}`,
    });

    // BNB是18位小数
    let bnbBalance = formatEther(balance);
    // 格式化为6位小数
    bnbBalance = parseFloat(bnbBalance).toFixed(6);

    console.log('BNB余额:', bnbBalance);
    return bnbBalance;
  } catch (error) {
    console.error('BNB余额获取失败:', error);
    throw new Error('获取BNB余额失败');
  }
};

// 获取TRX余额
export const fetchTrxBalance = async (address: string): Promise<string> => {
  if (!address) {
    throw new Error('缺少钱包地址');
  }

  try {
    const balance = await tronWeb.trx.getBalance(address);
    // TRX是6位小数
    const trxBalance = (balance / 1e6).toFixed(6);

    console.log('TRX余额:', trxBalance);
    return trxBalance;
  } catch (error) {
    console.error('TRX余额获取失败:', error);
    throw new Error('获取TRX余额失败');
  }
};

// 根据网络获取原生代币余额
export const getWalletNetworkBalance = async (
  address: string,
  network: 'ETH' | 'BSC' | 'TRX',
): Promise<string> => {
  if (!address) {
    throw new Error('缺少钱包地址');
  }

  if (!network) {
    throw new Error('缺少网络类型');
  }

  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let balance: string;

      switch (network) {
        case 'ETH':
          balance = await fetchEthBalance(address);
          break;
        case 'BSC':
          balance = await fetchBnbBalance(address);
          break;
        case 'TRX':
          balance = await fetchTrxBalance(address);
          break;
        default:
          throw new Error('不支持的网络类型');
      }

      log(
        `获取${network} - ${address}余额成功 (尝试 ${attempt}/${maxRetries}):`,
        balance,
      );

      return balance;
    } catch (error) {
      console.error(
        `获取${network}余额失败 (尝试 ${attempt}/${maxRetries}):`,
        error,
      );

      if (attempt === maxRetries) {
        throw new Error(`获取${network}余额失败`);
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`获取${network} - ${address}余额失败`);
};
