import axios from 'axios';
import { IdGen } from './idGen';
import { TronWeb } from 'tronweb';
import { IBot } from '../models/bot';
import { IUser } from '../models/user';
import { IBotUser } from '../models/botUser';
import { IBotUserConfig } from '../models/botUserConfig';
import { IPackageUsageRecord } from '../models/packageUsageRecord';
import UnRental from '../models/unrental';
import PackageOrder from '../models/packageOrder';
import EnergySend, { IEnergySend } from '../models/energySend';
import { getAdminUser } from './buyTelegramPremium';
import { decrypt } from '../services/encrypt';
import { IRental } from '../models/rental';
// import { IUnRental } from '../models/unrental'
import Deduction from '../models/deduction';
import {
  checkAccountPermission,
  setupAccountPermission,
} from './tronPermissionManager';

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
  const startTimestamp = now - minutes * 60 * 1000;

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
  const energySend = await EnergySend.findOne({
    rental: rental._id,
    status: 'success',
  });

  if (energySend) {
    console.log(`[rentEnergy]: ${rental._id} 租赁已完成，无需再次租赁]`);
    throw new Error(`[rentEnergy]: ${rental._id} 租赁已完成，无需再次租赁]`);
  }

  if (rental.status === 'completed') {
    console.log(`[rentEnergy]: ${rental._id} 租赁已完成，无需再次租赁]`);
    return;
  }

  console.log('[rentEnergy] 获取管理员信息...');
  const admin = await getAdminUser();

  // 检查管理员是否有 energy_address（B 地址，放能量的地址）
  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  // 解密 energy_privateKey（A 地址的私钥）
  console.log('[rentEnergy] 解密管理员 energy_privateKey...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb，使用 A 地址的私钥
  console.log('[rentEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  // B 地址是放能量的地址，A 地址用私钥控制它
  const energyAddress = admin.energy_address; // B 地址
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址

  // 确保 fromAddress 是有效的字符串
  if (!fromAddress || typeof fromAddress !== 'string') {
    throw new Error('无法从私钥生成有效地址');
  }

  console.log('[rentEnergy] 获取地址信息...', {
    energyAddress, // B 地址（放能量的地址）
    fromAddress, // A 地址（有私钥的地址）
  });

  // 检查 A 地址是否已经在 B 地址的 activePermission 中
  console.log('[rentEnergy] 检查账户权限...');
  const hasPermission = await checkAccountPermission(
    energyAddress,
    fromAddress,
  );

  if (!hasPermission) {
    console.log('[rentEnergy] A 地址没有 B 地址的权限，开始设置权限...');
    try {
      await setupAccountPermission(decryptedPrivateKey, energyAddress);
      console.log('[rentEnergy] 权限设置成功');
    } catch (error) {
      console.error('[rentEnergy] 权限设置失败:', error);
      throw new Error('无法设置账户权限，能量租赁失败');
    }
  } else {
    console.log('[rentEnergy] A 地址已有 B 地址的权限');
  }

  const es = await EnergySend.findOneAndUpdate(
    {
      tx_id: rental.tx_id,
    },
    {
      $set: {
        bot: rental.bot,
        botUser: rental.botUser,
        rental: rental._id,
        energySendAddress: fromAddress, // 使用 A 地址（有私钥的地址）
        // proxy 字段可选，若 rental.proxy 存在则赋值
        ...(rental.proxy ? { proxy: rental.proxy } : {}),
        from_address: energyAddress, // 使用 B 地址（放能量的地址）
        to_address: rental.from_address,
        amount: amount,
        separation: rental.separation,
        price: rental.price,
        actual_price: rental.actual_price,
        limit_hour: rental.limit_hour,
        type: 'flash',
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  try {
    const amountSunStr = tronWeb.toSun(amount); // 返回 string
    const amountSun = Number(amountSunStr) / 10; // 转为 number 并除以 10

    // 打印详细日志
    console.log('[rentEnergy] 租赁能量参数:', {
      rentalId: rental?.id,
      energyAddress, // B 地址（放能量的地址）
      fromAddress, // A 地址（有私钥的地址）
      toAddress,
      amount,
      amountSun,
      amountSunStr,
    });

    console.log('[rentEnergy] 构建 delegateResource 交易...');
    // 设置默认地址为 B 地址（energyAddress）
    tronWeb.setAddress(energyAddress);
    // 使用 B 地址作为 from_address，但用 A 的私钥签名
    const tx = await tronWeb.transactionBuilder.delegateResource(
      amountSun, // 第1个参数：租赁的TRX数量（以Sun为单位）
      toAddress, // 第2个参数：接收能量的地址（租给谁）
      'ENERGY', // 第3个参数：租赁的资源类型（能量）
      energyAddress, // 第4个参数：出租能量的地址（B 地址，放能量的地址）
    );
    console.log('[rentEnergy] 构建交易完成:', tx);

    console.log('[rentEnergy] 多签交易...');
    // 使用 A 的私钥进行多签（因为 B 授权给了 A）
    const stx = await tronWeb.trx.multiSign(
      tx,
      decryptedPrivateKey,
      3, // PERMISSION_ID，通常为0表示active权限
    );

    console.log('[rentEnergy] 多签交易完成:', stx);

    console.log('[rentEnergy] 广播交易...');
    const result = await tronWeb.trx.broadcast(stx);

    if (!result || result.result !== true) {
      throw new Error(`[rentEnergy] 发送交易失败: ${JSON.stringify(result)}`);
    }

    rental.error = JSON.stringify(result);
    rental.tx_id = result.txid;
    rental.transactionAt = new Date();
    rental.endAt = new Date(
      rental.transactionAt.getTime() + rental.limit_hour * 60 * 60 * 1000,
    );
    rental.energyFromAddress = energyAddress; // 使用 B 地址（放能量的地址）
    rental.energySendAddress = fromAddress; // 使用 A 地址（有私钥的地址）
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
    rental.error = error.message;
    rental.status = 'failed';
    rental.energyFromAddress = energyAddress; // 使用 B 地址（放能量的地址）
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
  const existUnRental = await UnRental.findOne({
    rental: rental._id,
    status: 'success',
  });

  if (existUnRental) {
    console.log(`[unRentEnergy]: ${rental._id} 能量回收已完成，无需再次回收]`);
    throw new Error(
      `[unRentEnergy]: ${rental._id} 能量回收已完成，无需再次回收]`,
    );
  }

  if (rental.status === 'recycled') {
    console.log('[unRentEnergy] ------ 当前状态是 recycled:', rental.status);
    throw new Error(`---- 当前echange记录的状态已回收:', ${rental.status}`);
  }

  // 获取管理员用户
  console.log('[unRentEnergy] 获取管理员用户...');
  const admin = await getAdminUser();

  // 检查管理员是否有 energy_address（B 地址，放能量的地址）
  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  // 解密私钥（A 地址的私钥）
  console.log('[unRentEnergy] 解密管理员能量私钥...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb，使用 A 地址的私钥
  console.log('[unRentEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  // B 地址是放能量的地址，A 地址用私钥控制它
  const energyAddress = admin.energy_address; // B 地址
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址
  console.log('[unRentEnergy] 管理员地址信息:', {
    energyAddress, // B 地址（放能量的地址）
    fromAddress, // A 地址（有私钥的地址）
  });

  const unRental = await UnRental.findOneAndUpdate(
    {
      rental: rental._id,
    },
    {
      $set: {
        bot: rental.bot,
        botUser: rental.botUser,
        proxy: rental.proxy,
        from: energyAddress, // 使用 B 地址（放能量的地址）
        to: rental.from_address,
        energySendAddress: fromAddress,
        separation: rental.separation,
        amount: rental.amount,
        limit_hour: rental.limit_hour,
        price: rental.price,
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
    const amountSun = Number(amountSunStr) / 10;
    console.log(
      '[unRentEnergy] 解除租赁 amount:',
      rental.amount,
      'Sun:',
      amountSun,
    );

    // 创建解除租赁交易（新方法，使用多签）
    console.log('[unRentEnergy] 创建解除租赁交易（多签）...');
    tronWeb.setAddress(energyAddress);
    const transaction = await tronWeb.transactionBuilder.undelegateResource(
      amountSun, // 解除租赁的能量数量（Sun单位）
      rental.from_address, // 被解除租赁的用户地址
      'ENERGY', // 资源类型，固定为 'ENERGY'
      energyAddress, // 管理员（发起解除租赁）的地址，使用 B 地址
    );
    console.log('[unRentEnergy] 解除租赁交易已构建:', transaction);

    // 多签交易（使用 A 的私钥进行多签，PERMISSION_ID 通常为 0 表示 active 权限）
    console.log('[unRentEnergy] 多签交易...');
    const signedTx = await tronWeb.trx.multiSign(
      transaction,
      decryptedPrivateKey,
      3, // PERMISSION_ID，通常为0或3，视合约配置而定
    );
    console.log('[unRentEnergy] 多签交易完成:', signedTx);

    // 广播交易
    console.log('[unRentEnergy] 广播交易...');
    const result = await tronWeb.trx.broadcast(signedTx);
    console.log('[unRentEnergy] 广播交易结果:', result);

    if (!result || result.result !== true) {
      throw new Error(
        `[unRentEnergy] 解除租赁交易失败: ${JSON.stringify(result)}`,
      );
    }

    unRental.error = JSON.stringify(result);
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

async function deductProxyTrxBalance(
  type: string,
  bot: IBot,
  proxyBotUser: IBotUser,
  proxyBotUserConfig: IBotUserConfig,
  proxyUser: IUser,
  commission: number,
  deductable: any, // 参数名称由 rental 改为 deductable
): Promise<boolean> {
  try {
    // 检查该 deductable 是否已经有扣款记录
    const existDeduction = await Deduction.findOne({
      deductable: deductable._id,
      type, // 保持类型一致
    });

    if (existDeduction) {
      console.log(
        `[deductProxyTrxBalance] 已存在扣款记录, 跳过处理, 扣款记录ID: ${existDeduction.id}`,
      );
      return true;
    }

    // 扣减代理用户 TRX 余额
    const balanceBefore = proxyBotUserConfig.trx_balance;
    proxyBotUserConfig.trx_balance -= commission;
    await proxyBotUserConfig.save();

    // 按照 deduction.ts 的 schema 进行多态关联
    const deduction = await Deduction.create({
      id: await IdGen.next(Deduction, 'id', 6),
      bot: bot._id,
      botUser: proxyBotUser._id,
      amount: commission,
      currency: 'TRX',
      reason: `为下级用户自动闪租能量`,
      type: 'rental', // 必须为 'Rental' 或 'Recharge'
      deductable: deductable._id, // 多态关联到 rental
      status: 'completed',
      balance_before: balanceBefore,
      balance_after: proxyBotUserConfig.trx_balance,
      remark: `租赁记录ID: ${deductable.id}`,
      processedAt: new Date(),
      proxy: proxyUser._id,
      from_address: deductable?.from_address,
      to_address: deductable?.to_address,
    });

    console.log(
      `[deductProxyTrxBalance] 已扣减代理用户 ${proxyUser.id} 的 TRX 余额: ${commission}, 扣款记录ID: ${deduction.id}`,
    );

    return true;
  } catch (error) {
    console.error(
      '[deductProxyTrxBalance] 处理代理用户 TRX 余额扣减失败:',
      error,
    );
    return false;
  }
}

async function genericSendEnergy(
  toAddress: string,
  amount: number,
  record?: IPackageUsageRecord,
  pens?: number,
): Promise<string> {
  const existingEnergySend = await EnergySend.findOne({
    tx_id: record.hash,
  });

  if (existingEnergySend) {
    console.log(
      `[genericSendEnergy] packageUsageRecord ${record.id} 已经有发送记录，跳过`,
    );

    return;
  }

  const admin = await getAdminUser();

  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  console.log('[genericSendEnergy] 解密管理员 energy_privateKey...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  console.log('[genericSendEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const energyAddress = admin.energy_address; // B 地址，放能量
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址

  if (!fromAddress || typeof fromAddress !== 'string') {
    throw new Error('无法从私钥生成有效地址');
  }

  console.log('[genericSendEnergy] 地址信息:', { energyAddress, fromAddress });

  console.log('[genericSendEnergy] 检查账户权限...');
  const hasPermission = await checkAccountPermission(
    energyAddress,
    fromAddress,
  );
  if (!hasPermission) {
    console.log('[genericSendEnergy] A 地址没有 B 地址的权限，开始设置权限...');
    try {
      await setupAccountPermission(decryptedPrivateKey, energyAddress);
      console.log('[genericSendEnergy] 权限设置成功');
    } catch (error) {
      console.error('[genericSendEnergy] 权限设置失败:', error);
      throw new Error('无法设置账户权限，能量发送失败');
    }
  } else {
    console.log('[genericSendEnergy] A 地址已有 B 地址的权限');
  }

  const packageOrder = await PackageOrder.findById(record.packageOrder);

  const es = await EnergySend.create({
    bot: record.bot,
    botUser: record.botUser,
    proxy: record.proxy,
    packageUsageRecord: record._id,
    from_address: energyAddress,
    to_address: record.address,
    energySendAddress: fromAddress,
    amount,
    separation: pens,
    limit_day: packageOrder.validityDays,
    type: 'daily',
    status: 'pending',
  });

  try {
    const amountSunStr = tronWeb.toSun(amount);
    const amountSun = Number(amountSunStr) / 10;

    console.log('[genericSendEnergy] 构建 delegateResource 交易...', {
      toAddress,
      amount,
      amountSun,
      fromAddress,
      energyAddress,
    });

    tronWeb.setAddress(energyAddress);

    const tx = await tronWeb.transactionBuilder.delegateResource(
      amountSun,
      toAddress,
      'ENERGY',
      energyAddress,
    );

    console.log('[genericSendEnergy] 多签交易...');
    const stx = await tronWeb.trx.multiSign(tx, decryptedPrivateKey, 3);

    console.log('[genericSendEnergy] 广播交易...');
    const result = await tronWeb.trx.broadcast(stx);

    if (!result || result.result !== true) {
      throw new Error(
        `[genericSendEnergy] 发送交易失败: ${JSON.stringify(result)}`,
      );
    }

    console.log('[genericSendEnergy] 能量发送成功，交易ID:', result.txid);

    es.tx_id = result.txid;
    es.status = 'success';
    await es.save();

    record.hash = result.txid;
    record.status = 'success';
    await record.save();

    return result.txid;
  } catch (error) {
    console.error('[genericSendEnergy] 能量发送失败:', error);

    es.status = 'failed';
    await es.save();

    record.status = 'failed';
    await record.save();

    throw error;
  }
}

async function genericRecycleEnergy(energySend: IEnergySend): Promise<any> {
  const existUnRental = await UnRental.findOne({
    packageUsageRecord: energySend.packageUsageRecord,
    txid: { $ne: null },
    status: 'success',
  });

  if (existUnRental) {
    console.log(
      `[genericRecycleEnergy]: ${energySend._id} 能量回收已完成，无需再次回收]`,
    );
    throw new Error(
      `[genericRecycleEnergy]: ${energySend._id} 能量回收已完成，无需再次回收]`,
    );
  }

  console.log(
    '[genericRecycleEnergy] 开始处理能量回收, amount:',
    energySend.amount,
  );

  // 获取管理员用户
  console.log('[genericRecycleEnergy] 获取管理员用户...');
  const admin = await getAdminUser();

  // 检查管理员是否有 energy_address（B 地址，放能量的地址）
  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  // 解密私钥（A 地址的私钥）
  console.log('[genericRecycleEnergy] 解密管理员能量私钥...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb，使用 A 地址的私钥
  console.log('[genericRecycleEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  // B 地址是放能量的地址，A 地址用私钥控制它
  const energyAddress = admin.energy_address; // B 地址
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址
  console.log('[genericRecycleEnergy] 管理员地址信息:', {
    energyAddress, // B 地址（放能量的地址）
    fromAddress, // A 地址（有私钥的地址）
  });

  // 更新或创建 UnRental（或者类似的回收记录）
  const unRental = await UnRental.findOneAndUpdate(
    {
      packageUsageRecord: energySend.packageUsageRecord,
    },
    {
      $set: {
        bot: energySend.bot,
        botUser: energySend.botUser,
        proxy: energySend.proxy,
        from: energyAddress, // 使用 B 地址（放能量的地址）
        to: energySend.to_address,
        energySendAddress: fromAddress,
        separation: energySend.separation,
        amount: energySend.amount,
        limit_day: energySend.limit_day,
        price: energySend.price,
        txid: energySend.tx_id,
        status: 'pending', // 初始为 pending，表示回收交易正在处理中
      },
    },
  );

  console.log('[genericRecycleEnergy] UnRental 记录已创建:', unRental?._id);

  try {
    const amountSunStr = tronWeb.toSun(energySend.amount); // 转为Sun单位字符串
    const amountSun = Number(amountSunStr) / 10; // 转换为 Sun 单位
    console.log(
      '[genericRecycleEnergy] 解除租赁 amount:',
      energySend.amount,
      'Sun:',
      amountSun,
    );

    // 创建解除能量交易（新方法，使用多签）
    console.log('[genericRecycleEnergy] 创建解除能量交易（多签）...');
    tronWeb.setAddress(energyAddress);
    const transaction = await tronWeb.transactionBuilder.undelegateResource(
      amountSun, // 解除租赁的能量数量（Sun单位）
      energySend.from_address, // 被解除租赁的用户地址
      'ENERGY', // 资源类型，固定为 'ENERGY'
      energyAddress, // 管理员（发起解除租赁）的地址，使用 B 地址
    );
    console.log('[genericRecycleEnergy] 解除能量交易已构建:', transaction);

    // 多签交易（使用 A 的私钥进行多签，PERMISSION_ID 通常为 0 表示 active 权限）
    console.log('[genericRecycleEnergy] 多签交易...');
    const signedTx = await tronWeb.trx.multiSign(
      transaction,
      decryptedPrivateKey,
      3, // PERMISSION_ID，通常为0或3，视合约配置而定
    );
    console.log('[genericRecycleEnergy] 多签交易完成:', signedTx);

    // 广播交易
    console.log('[genericRecycleEnergy] 广播交易...');
    const result = await tronWeb.trx.broadcast(signedTx);
    console.log('[genericRecycleEnergy] 广播交易结果:', result);

    if (!result || result.result !== true) {
      throw new Error(
        `[genericRecycleEnergy] 解除能量交易失败: ${JSON.stringify(result)}`,
      );
    }

    unRental.error = JSON.stringify(result);
    unRental.status = 'success';
    unRental.hash = result.txid;
    await unRental.save();
    console.log(
      '[genericRecycleEnergy] UnRental 状态已更新为 success, hash:',
      result.txid,
    );

    energySend.status = 'recycled';
    await energySend.save();
    console.log('[genericRecycleEnergy] energySend 状态已更新为 recycled');

    // 回收完成，更新原始记录
    console.log('[genericRecycleEnergy] 更新回收状态...');
    return result.txid;
  } catch (error) {
    console.error('[genericRecycleEnergy] 解除能量失败:', error);

    unRental.status = 'failed';
    await unRental.save();
    console.log(
      '[genericRecycleEnergy] UnRental 状态已更新为 failed, unRentalId:',
      unRental?._id,
    );

    throw error;
  }
}

async function genericRecycleEnergyByAmount(
  amount: number,
  address: string,
  record?: IPackageUsageRecord,
  pens?: number,
): Promise<any> {
  console.log('[genericRecycleEnergyByAmount] 入参:', {
    amount,
    address,
    record,
    pens,
  });

  const existingUnRental = await UnRental.findOne({
    packageUsageRecord: record._id,
    hash: record.recycling_hash,
  });

  if (!existingUnRental) {
    console.log(
      `[genericRecycleEnergyByAmount]: packageUsageRecord ${record.id} 已回收了能量，跳过`,
      'existingUnRental:',
      existingUnRental,
    );
    return;
  }

  console.log(
    '[genericRecycleEnergyByAmount] 开始处理能量回收, amount:',
    amount,
  );

  // 获取管理员用户
  console.log('[genericRecycleEnergyByAmount] 获取管理员用户...');
  const admin = await getAdminUser();

  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  // 解密私钥
  console.log('[genericRecycleEnergyByAmount] 解密管理员能量私钥...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  // 初始化 TronWeb
  console.log('[genericRecycleEnergyByAmount] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const energyAddress = admin.energy_address; // B 地址
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址
  console.log('[genericRecycleEnergyByAmount] 管理员地址信息:', {
    energyAddress,
    fromAddress,
  });

  const unRental = await UnRental.create({
    bot: record.bot,
    botUser: record.botUser,
    proxy: record.proxy,
    packageUsageRecord: record._id,
    energySendAddress: fromAddress,
    from: admin.energy_address,
    to: record.address,
    separation: pens,
    amount: amount,
  });

  record.recycling_status = 'pending';
  await record.save();

  try {
    const amountSunStr = tronWeb.toSun(amount);
    const amountSun = Number(amountSunStr) / 10;
    console.log(
      '[genericRecycleEnergyByAmount] 解除租赁 amount:',
      amount,
      'Sun:',
      amountSun,
    );

    // 构建解除能量交易
    console.log('[genericRecycleEnergyByAmount] 创建解除能量交易...');
    tronWeb.setAddress(energyAddress);
    const transaction = await tronWeb.transactionBuilder.undelegateResource(
      amountSun,
      address, // 这里要指定被解除的地址，如果只有管理员则默认用管理员自己
      'ENERGY',
      energyAddress,
    );
    console.log('[genericRecycleEnergyByAmount] 交易已构建:', transaction);

    // 多签
    console.log('[genericRecycleEnergyByAmount] 多签交易...');
    const signedTx = await tronWeb.trx.multiSign(
      transaction,
      decryptedPrivateKey,
      3,
    );
    console.log('[genericRecycleEnergyByAmount] 多签完成:', signedTx);

    // 广播
    console.log('[genericRecycleEnergyByAmount] 广播交易...');
    const result = await tronWeb.trx.broadcast(signedTx);
    console.log('[genericRecycleEnergyByAmount] 广播结果:', result);

    if (!result || result.result !== true) {
      throw new Error(
        `[genericRecycleEnergyByAmount] 交易失败: ${JSON.stringify(result)}`,
      );
    }

    unRental.status = 'success';
    unRental.hash = result.txid;
    unRental.error = JSON.stringify(result);
    await unRental.save();

    record.recycling_status = 'success';
    record.recycling_hash = result.txid;
    await record.save();

    console.log(
      '[genericRecycleEnergyByAmount] UnRental 状态已更新为 success, hash:',
      result.txid,
    );

    return result.txid;
  } catch (error) {
    console.error('[genericRecycleEnergyByAmount] 解除能量失败:', error);
    unRental.status = 'failed';
    await unRental.save();

    record.recycling_status = 'failed';
    await record.save();

    console.log(
      '[genericRecycleEnergyByAmount] UnRental 状态已更新为 failed, unRentalId:',
      unRental._id,
    );
    throw error;
  }
}

async function resendEnergy(energySend: IEnergySend): Promise<string> {
  const amount = energySend.amount;

  const toAddress = energySend.to_address;

  const admin = await getAdminUser();

  if (!admin.energy_address) {
    throw new Error('管理员账户未设置 energy_address（放能量地址）');
  }

  console.log('[genericSendEnergy] 解密管理员 energy_privateKey...');
  const decryptedPrivateKey = decrypt(admin.energy_privateKey);

  console.log('[genericSendEnergy] 初始化 TronWeb...');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: decryptedPrivateKey,
  });

  const energyAddress = admin.energy_address; // B 地址，放能量
  const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址

  if (!fromAddress || typeof fromAddress !== 'string') {
    throw new Error('无法从私钥生成有效地址');
  }

  console.log('[genericSendEnergy] 地址信息:', { energyAddress, fromAddress });

  console.log('[genericSendEnergy] 检查账户权限...');
  const hasPermission = await checkAccountPermission(
    energyAddress,
    fromAddress,
  );
  if (!hasPermission) {
    console.log('[genericSendEnergy] A 地址没有 B 地址的权限，开始设置权限...');
    try {
      await setupAccountPermission(decryptedPrivateKey, energyAddress);
      console.log('[genericSendEnergy] 权限设置成功');
    } catch (error) {
      console.error('[genericSendEnergy] 权限设置失败:', error);
      throw new Error('无法设置账户权限，能量发送失败');
    }
  } else {
    console.log('[genericSendEnergy] A 地址已有 B 地址的权限');
  }

  try {
    const amountSunStr = tronWeb.toSun(amount);
    const amountSun = Number(amountSunStr) / 10;

    console.log('[genericSendEnergy] 构建 delegateResource 交易...', {
      toAddress,
      amount,
      amountSun,
      fromAddress,
      energyAddress,
    });

    tronWeb.setAddress(energyAddress);

    const tx = await tronWeb.transactionBuilder.delegateResource(
      amountSun,
      toAddress,
      'ENERGY',
      energyAddress,
    );

    console.log('[genericSendEnergy] 多签交易...');
    const stx = await tronWeb.trx.multiSign(tx, decryptedPrivateKey, 3);

    console.log('[genericSendEnergy] 广播交易...');
    const result = await tronWeb.trx.broadcast(stx);

    if (!result || result.result !== true) {
      throw new Error(
        `[genericSendEnergy] 发送交易失败: ${JSON.stringify(result)}`,
      );
    }

    console.log('[genericSendEnergy] 能量发送成功，交易ID:', result.txid);

    energySend.status = 'success';
    await energySend.save();

    return result.txid;
  } catch (error) {
    console.error('[genericSendEnergy] 能量发送失败:', error);

    throw error;
  }
}

// async function reRecycle(unrental: IUnRental): Promise<any> {
//   console.log('[unRentEnergy] 开始处理能量回收, rentalId:', unrental?._id);

//   const amount = unrental.amount

//   const

//   // 获取管理员用户
//   console.log('[unRentEnergy] 获取管理员用户...');
//   const admin = await getAdminUser();

//   // 检查管理员是否有 energy_address（B 地址，放能量的地址）
//   if (!admin.energy_address) {
//     throw new Error('管理员账户未设置 energy_address（放能量地址）');
//   }

//   // 解密私钥（A 地址的私钥）
//   console.log('[unRentEnergy] 解密管理员能量私钥...');
//   const decryptedPrivateKey = decrypt(admin.energy_privateKey);

//   // 初始化 TronWeb，使用 A 地址的私钥
//   console.log('[unRentEnergy] 初始化 TronWeb...');
//   const tronWeb = new TronWeb({
//     fullHost: 'https://api.trongrid.io',
//     privateKey: decryptedPrivateKey,
//   });

//   // B 地址是放能量的地址，A 地址用私钥控制它
//   const energyAddress = admin.energy_address; // B 地址
//   const fromAddress = tronWeb.address.fromPrivateKey(decryptedPrivateKey); // A 地址
//   console.log('[unRentEnergy] 管理员地址信息:', {
//     energyAddress, // B 地址（放能量的地址）
//     fromAddress, // A 地址（有私钥的地址）
//   });

//   try {
//     const amountSunStr = tronWeb.toSun(amount); // 转为Sun单位字符串
//     const amountSun = Number(amountSunStr) / 10;
//     console.log(
//       '[unRentEnergy] 解除租赁 amount:',
//       amount,
//       'Sun:',
//       amountSun,
//     );

//     // 创建解除租赁交易（新方法，使用多签）
//     console.log('[unRentEnergy] 创建解除租赁交易（多签）...');
//     tronWeb.setAddress(energyAddress);
//     const transaction = await tronWeb.transactionBuilder.undelegateResource(
//       amountSun, // 解除租赁的能量数量（Sun单位）
//       rental.from_address, // 被解除租赁的用户地址
//       'ENERGY', // 资源类型，固定为 'ENERGY'
//       energyAddress, // 管理员（发起解除租赁）的地址，使用 B 地址
//     );
//     console.log('[unRentEnergy] 解除租赁交易已构建:', transaction);

//     // 多签交易（使用 A 的私钥进行多签，PERMISSION_ID 通常为 0 表示 active 权限）
//     console.log('[unRentEnergy] 多签交易...');
//     const signedTx = await tronWeb.trx.multiSign(
//       transaction,
//       decryptedPrivateKey,
//       3, // PERMISSION_ID，通常为0或3，视合约配置而定
//     );
//     console.log('[unRentEnergy] 多签交易完成:', signedTx);

//     // 广播交易
//     console.log('[unRentEnergy] 广播交易...');
//     const result = await tronWeb.trx.broadcast(signedTx);
//     console.log('[unRentEnergy] 广播交易结果:', result);

//     if (!result || result.result !== true) {
//       throw new Error(
//         `[unRentEnergy] 解除租赁交易失败: ${JSON.stringify(result)}`,
//       );
//     }

//     unRental.error = JSON.stringify(result);
//     unRental.status = 'success';
//     unRental.hash = result.txid;
//     await unRental.save();
//     console.log(
//       '[unRentEnergy] UnRental 状态已更新为 success, hash:',
//       result.txid,
//     );

//     rental.status = 'recycled';
//     await rental.save();
//     console.log(
//       '[unRentEnergy] Rental 状态已更新为 recycled, rentalId:',
//       rental?._id,
//     );

//     return result.txid;
//   } catch (error) {
//     console.error('[unRentEnergy] 解除租赁能量失败:', error);

//     unRental.status = 'failed';
//     await unRental.save();
//     console.log(
//       '[unRentEnergy] UnRental 状态已更新为 failed, unRentalId:',
//       unRental?._id,
//     );

//     throw error;
//   }
// }

export {
  fetchTrxTransactions,
  fetchTrc20Transactions,
  fetchEnergyContractCalls,
  getAccountBalances,
  rentEnergy,
  unRentEnergy,
  deductProxyTrxBalance,
  genericSendEnergy,
  genericRecycleEnergy,
  genericRecycleEnergyByAmount,
  resendEnergy,
};
