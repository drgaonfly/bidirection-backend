import axios from 'axios';

interface EthTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

interface EtherscanResponse {
  status: '0' | '1';
  message: string;
  result: EthTokenTransfer[];
}

const ETHERSCAN_API_KEY = 'CXTB4IUT31N836G93ZI3YQBEWBQEGGH5QS';
const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // ETH USDT合约
const TARGET_ADDRESS = '0x2b8e8b6e7e3a2e63bf7b66b74fd9b5bff0318a88'; // 你的ETH地址
const CHECK_INTERVAL = 30000; // 30秒检查一次

/**
 * 获取最近15分钟的ETH USDT转账
 */
async function fetchRecent15MinTransfers(): Promise<EthTokenTransfer[]> {
  const url = new URL('https://api.etherscan.io/api');
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'tokentx');
  url.searchParams.set('contractaddress', USDT_CONTRACT);
  url.searchParams.set('address', TARGET_ADDRESS);
  url.searchParams.set('startblock', '0');
  url.searchParams.set('endblock', '99999999');
  url.searchParams.set('sort', 'desc');
  url.searchParams.set('apikey', ETHERSCAN_API_KEY);

  const now = Math.floor(Date.now() / 1000);
  const fifteenMinAgo = now - 15 * 60;

  try {
    const response = await axios.get<EtherscanResponse>(url.toString());

    if (response.data.status !== '1') {
      throw new Error(`Etherscan API 错误: ${response.data.message}`);
    }

    // 只保留15分钟内的USDT转账
    return response.data.result.filter(
      (t) => parseInt(t.timeStamp) >= fifteenMinAgo && t.tokenSymbol === 'USDT',
    );
  } catch (error) {
    console.error(
      'API请求失败:',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

function processTransfer(transfer: EthTokenTransfer): void {
  const timestamp = parseInt(transfer.timeStamp) * 1000;
  // ETH USDT使用6位小数
  const amount = (parseInt(transfer.value) / 1e6).toFixed(2);
  const direction =
    transfer.to.toLowerCase() === TARGET_ADDRESS.toLowerCase()
      ? '接收'
      : '发送';

  console.log(`📤 新USDT交易（${direction}）：
  交易哈希: ${transfer.hash}
  时间: ${new Date(timestamp).toLocaleString()}
  金额: ${amount} USDT
  对方地址: ${direction === '接收' ? transfer.from : transfer.to}
  ------------------------`);
}

async function checkTransfers() {
  try {
    const transfers = await fetchRecent15MinTransfers();

    if (transfers.length > 0) {
      // 按时间升序输出
      transfers
        .sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp))
        .forEach((t) => {
          processTransfer(t);
        });
    } else {
      console.log('最近15分钟无USDT交易');
    }
  } catch (error) {
    console.error(
      '检查交易时发生错误:',
      error instanceof Error ? error.message : error,
    );
  }
}

console.log(`🚀 查询地址 ${TARGET_ADDRESS} 近15分钟的ETH USDT交易...`);
// 立即运行一次后按间隔执行
checkTransfers();
setInterval(checkTransfers, CHECK_INTERVAL);
