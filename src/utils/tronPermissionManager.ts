import { TronWeb } from 'tronweb';

/**
 * TRON 账户权限管理器
 * 用于设置和管理多签权限，让 A 地址能够代表 B 地址进行操作
 */

/**
 * 检查 A 地址是否已经在 B 地址的 activePermission 中
 * @param energyAddress B 地址（放能量的地址）
 * @param fromAddress A 地址（有私钥的地址）
 */
export async function checkAccountPermission(
  energyAddress: string,
  fromAddress: string,
): Promise<boolean> {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });

    const accountInfo = await tronWeb.trx.getAccount(energyAddress);

    if (!accountInfo.active_permission) {
      return false;
    }

    return accountInfo.active_permission.some((perm: any) =>
      perm.keys.some((key: any) => key.address === fromAddress),
    );
  } catch (error) {
    console.error('[checkAccountPermission] 检查账户权限失败:', error);
    return false;
  }
}

/**
 * 获取账户的权限信息
 * @param address 要查询的地址
 */
export async function getAccountPermissions(address: string): Promise<any> {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });

    const accountInfo = await tronWeb.trx.getAccount(address);
    return {
      address,
      hasActivePermission: !!accountInfo.active_permission,
      activePermissionCount: accountInfo.active_permission?.length || 0,
      permissions: accountInfo.active_permission || [],
      masterWeight: (accountInfo as any).master_weight || 0,
    };
  } catch (error) {
    console.error('[getAccountPermissions] 获取账户权限失败:', error);
    throw error;
  }
}

/**
 * 设置账户权限（简化版本，提供指导信息）
 * @param adminPrivateKey A 地址的私钥
 * @param energyAddress B 地址（放能量的地址）
 */
export async function setupAccountPermission(
  adminPrivateKey: string,
  energyAddress: string,
): Promise<any> {
  try {
    console.log('[setupAccountPermission] 开始设置账户权限...');

    // 初始化 TronWeb，使用 A 地址的私钥
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      privateKey: adminPrivateKey,
    });

    const fromAddress = tronWeb.address.fromPrivateKey(adminPrivateKey);

    // 确保 fromAddress 是有效的字符串
    if (!fromAddress || typeof fromAddress !== 'string') {
      throw new Error('无法从私钥生成有效地址');
    }

    console.log('[setupAccountPermission] 地址信息:', {
      fromAddress, // A 地址（有私钥的地址）
      energyAddress, // B 地址（放能量的地址）
    });

    // 获取 B 地址的当前账户信息
    const accountInfo = await tronWeb.trx.getAccount(energyAddress);
    console.log('[setupAccountPermission] 当前账户信息:', accountInfo);

    // 检查是否已经有 activePermission
    const hasActivePermission = await checkAccountPermission(
      energyAddress,
      fromAddress,
    );

    if (hasActivePermission) {
      console.log(
        '[setupAccountPermission] A 地址已经在 B 地址的 activePermission 中，无需重复设置',
      );
      return { success: true, message: '权限已存在' };
    }

    console.log('[setupAccountPermission] 需要设置账户权限');
    console.log('[setupAccountPermission] 请按照以下步骤操作：');
    console.log('[setupAccountPermission] 1. 使用 TronLink 钱包登录 B 地址');
    console.log('[setupAccountPermission] 2. 进入"设置" -> "账户权限"');
    console.log(
      '[setupAccountPermission] 3. 添加 A 地址为 activePermission，设置权重为 1',
    );
    console.log('[setupAccountPermission] 4. 设置权限阈值为 1');
    console.log('[setupAccountPermission] 5. 确认并广播交易');
    console.log('[setupAccountPermission] 或者使用 TRON 官方 API 设置多签权限');

    return {
      success: false,
      message: '需要手动设置权限',
      instructions: {
        step1: '使用 TronLink 钱包登录 B 地址',
        step2: '进入"设置" -> "账户权限"',
        step3: '添加 A 地址为 activePermission，设置权重为 1',
        step4: '设置权限阈值为 1',
        step5: '确认并广播交易',
      },
      addresses: {
        fromAddress,
        energyAddress,
      },
    };
  } catch (error) {
    console.error('[setupAccountPermission] 设置账户权限失败:', error);
    throw error;
  }
}

/**
 * 验证权限设置是否成功
 * @param energyAddress B 地址（放能量的地址）
 * @param fromAddress A 地址（有私钥的地址）
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export async function verifyPermissionSetup(
  energyAddress: string,
  fromAddress: string,
  maxRetries: number = 10,
  retryDelay: number = 2000,
): Promise<boolean> {
  console.log('[verifyPermissionSetup] 开始验证权限设置...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const hasPermission = await checkAccountPermission(
        energyAddress,
        fromAddress,
      );

      if (hasPermission) {
        console.log('[verifyPermissionSetup] 权限设置验证成功！');
        return true;
      }

      console.log(
        `[verifyPermissionSetup] 第 ${
          i + 1
        } 次验证失败，等待 ${retryDelay}ms 后重试...`,
      );

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`[verifyPermissionSetup] 第 ${i + 1} 次验证出错:`, error);

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.log('[verifyPermissionSetup] 权限设置验证失败，已达到最大重试次数');
  return false;
}
