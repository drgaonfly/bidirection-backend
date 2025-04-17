import {
  createPublicClient,
  http,
  createWalletClient as createViemWalletClient,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { mainnet, bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT_CONTRACT_ADDRESSES } from './getBalance';

const USDT_ABI = [
  {
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * 获取对应网络的USDT合约地址
 * @param network - 网络类型 ('ETH' | 'BSC' | 'TRX')
 * @returns USDT合约地址
 */
export const getUsdtAddress = (
  network: keyof typeof USDT_CONTRACT_ADDRESSES,
): string => {
  return USDT_CONTRACT_ADDRESSES[network];
};

/**
 * 执行USDT转账交易
 * @param client - 钱包客户端实例
 * @param usdtAddress - USDT合约地址
 * @param sender - 发送方地址
 * @param recipient - 接收方地址
 * @param amount - 转账金额
 * @param account - 账户实例
 * @returns 交易哈希
 */
const transferFrom = async (
  client: any,
  usdtAddress: string,
  sender: string,
  recipient: string,
  amount: bigint,
  account: Account,
): Promise<`0x${string}`> => {
  const hash = await client.writeContract({
    address: usdtAddress as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'transferFrom',
    args: [sender, recipient, amount],
    account: account,
  });

  return hash;
};

/**
 * 创建账户
 * @param secretKey - 私钥
 * @returns 账户实例
 */
const createAccount = (secretKey: `0x${string}`): Account => {
  return privateKeyToAccount(secretKey);
};

/**
 * 等待交易完成
 * @param publicClient - 公共客户端实例
 * @param hash - 交易哈希
 * @returns Promise<void>
 */
const waitForTransaction = async (
  publicClient: PublicClient,
  hash: `0x${string}`,
): Promise<void> => {
  await publicClient.waitForTransactionReceipt({ hash });
};

/**
 * 创建钱包客户端
 * @param account - 账户信息
 * @param network - 网络类型 ('ETH' | 'BSC')
 * @returns 钱包客户端实例
 */
const createWalletClient = (
  account: Account,
  network: 'ETH' | 'BSC',
): WalletClient => {
  return createViemWalletClient({
    account,
    chain: network === 'ETH' ? mainnet : bsc,
    transport: http(
      network === 'ETH'
        ? 'https://ethereum.publicnode.com'
        : 'https://bsc-dataseed1.binance.org/',
    ),
  });
};

/**
 * 获取代币授权额度
 * @param publicClient - 公共客户端实例
 * @param usdtAddress - USDT代币合约地址
 * @param sender - 授权者地址
 * @param spender - 被授权者地址
 * @returns 授权额度(bigint类型)
 */
const allowance = async (
  publicClient: PublicClient,
  usdtAddress: string,
  sender: string,
  spender: string,
): Promise<bigint> => {
  const allowanceAmount = (await publicClient.readContract({
    address: usdtAddress as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: [sender, spender],
  })) as bigint;

  return allowanceAmount;
};

/**
 * 创建公共客户端
 * @param network - 网络类型 ('ETH' | 'BSC')
 * @returns 公共客户端实例
 */
const createPublicClientInstance = (network: 'ETH' | 'BSC'): PublicClient => {
  return createPublicClient({
    chain: network === 'ETH' ? mainnet : bsc,
    transport: http(
      network === 'ETH'
        ? 'https://ethereum.publicnode.com'
        : 'https://bsc-dataseed1.binance.org/',
    ),
  });
};

/**
 * 执行代币归集操作
 * @param network - 网络类型 ('ETH' | 'BSC')
 * @param fromAddress - 待归集的地址
 * @param toAddress - 归集目标地址
 * @param spenderSecretKey - 授权账户私钥
 * @returns 交易哈希
 */
export const collectTokens = async (
  network: 'ETH' | 'BSC',
  fromAddress: string,
  toAddress: string,
  spenderSecretKey: `0x${string}`,
): Promise<`0x${string}`> => {
  // 创建公共客户端
  const publicClient = createPublicClientInstance(network);

  // 获取USDT合约地址
  const usdtAddress = getUsdtAddress(network);

  // 创建spender账户
  const spenderAccount = createAccount(spenderSecretKey);

  // 创建钱包客户端
  const walletClient = createWalletClient(spenderAccount, network);

  // 检查授权额度
  const currentAllowance = await allowance(
    publicClient,
    usdtAddress,
    fromAddress,
    spenderAccount.address,
  );

  // 执行转账
  const hash = await transferFrom(
    walletClient,
    usdtAddress,
    fromAddress,
    toAddress,
    currentAllowance,
    spenderAccount,
  );

  // 等待交易完成
  await waitForTransaction(publicClient, hash);

  return hash;
};

/**
 * 执行代币分配操作
 * @param network - 网络类型 ('ETH' | 'BSC')
 * @param sender - 发送方地址
 * @param recipient1 - 第一接收方地址
 * @param recipient2 - 第二接收方地址（可选，代理钱包场景）
 * @param amount - 总金额
 * @param percentage1 - 第一接收方分配比例
 * @param percentage2 - 第二接收方分配比例
 * @param spenderSecretKey - 授权账户私钥
 * @param hasAgentWallet - 是否有代理钱包
 * @returns 交易信息
 */
export const distributeTokens = async (
  network: 'ETH' | 'BSC',
  sender: string,
  recipient1: string,
  recipient2: string | undefined,
  amount: string,
  percentage1: number,
  percentage2: number,
  spenderSecretKey: `0x${string}`,
  hasAgentWallet: boolean,
): Promise<{
  type: 'agent' | 'direct';
  hashes: `0x${string}`[];
  amounts: bigint[];
}> => {
  // 创建账户
  const account = createAccount(spenderSecretKey);

  // 创建客户端
  const publicClient = createPublicClientInstance(network);
  const walletClient = createWalletClient(account, network);

  // 获取USDT合约地址
  const usdtAddress = getUsdtAddress(network);

  // 计算总金额（考虑不同网络的精度）
  const totalAmount =
    BigInt(parseFloat(amount) * 1e6) *
    (network === 'ETH' ? BigInt(1) : BigInt(10 ** 12));

  // 检查余额
  const balance = (await publicClient.readContract({
    address: usdtAddress as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: [sender],
  })) as bigint;

  if (balance < totalAmount) {
    throw new Error(`余额不足: 需要 ${totalAmount}, 当前余额 ${balance}`);
  }

  // 检查授权额度
  const allowanceAmount = await allowance(
    publicClient,
    usdtAddress,
    sender,
    account.address,
  );

  if (allowanceAmount < totalAmount) {
    throw new Error(
      `授权额度不足: 需要 ${totalAmount}, 当前授权额度 ${allowanceAmount}`,
    );
  }

  const hashes: `0x${string}`[] = [];
  const amounts: bigint[] = [];

  if (hasAgentWallet && recipient2) {
    // 代理钱包模式：分两笔转账
    const amount1 =
      BigInt(parseFloat(amount) * percentage1 * 1e6) *
      (network === 'ETH' ? BigInt(1) : BigInt(10 ** 12));
    const amount2 =
      BigInt(parseFloat(amount) * percentage2 * 1e6) *
      (network === 'ETH' ? BigInt(1) : BigInt(10 ** 12));

    // 转账给平台
    const hash1 = await transferFrom(
      walletClient,
      usdtAddress,
      sender,
      recipient2,
      amount2,
      account,
    );
    await waitForTransaction(publicClient, hash1);

    // 转账给代理
    const hash2 = await transferFrom(
      walletClient,
      usdtAddress,
      sender,
      recipient1,
      amount1,
      account,
    );
    await waitForTransaction(publicClient, hash2);

    hashes.push(hash1, hash2);
    amounts.push(amount1, amount2);

    return {
      type: 'agent',
      hashes,
      amounts,
    };
  } else {
    // 直接转账模式：单笔转账
    const hash = await transferFrom(
      walletClient,
      usdtAddress,
      sender,
      recipient1,
      totalAmount,
      account,
    );
    await waitForTransaction(publicClient, hash);

    hashes.push(hash);
    amounts.push(totalAmount);

    return {
      type: 'direct',
      hashes,
      amounts,
    };
  }
};
