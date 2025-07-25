import { TronWeb } from 'tronweb';
import { getAdminUser } from '../utils/buyTelegramPremium';

// Initialize TronWeb with null private key, will be set after getting admin
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: '',
});

/**
 * 质押全部可用TRX（保留1 TRX作为手续费）
 */
async function stakeAllEnergy() {
  try {
    // 获取管理员用户以获取能量私钥
    const adminUser = await getAdminUser();

    if (!adminUser.energy_privateKey) {
      throw new Error('管理员账户未设置能量私钥');
    }

    // 设置私钥
    tronWeb.setPrivateKey(adminUser.energy_privateKey);

    // 确保 privateKey 存在
    if (!tronWeb.defaultPrivateKey) {
      throw new Error('未设置私钥');
    }

    const ownerAddress = tronWeb.address.fromPrivateKey(
      tronWeb.defaultPrivateKey as string,
    );
    console.log('操作账户:', ownerAddress);

    // 获取当前余额（单位：sun）
    const balanceSun = await tronWeb.trx.getBalance(ownerAddress);
    const balanceTRX = balanceSun / 1_000_000;

    if (balanceTRX <= 1) {
      throw new Error(
        `余额不足。至少需要保留 1 TRX 作为手续费，当前余额: ${balanceTRX} TRX`,
      );
    }

    // 计算可质押金额（保留1 TRX）
    const amountToStake = balanceTRX - 1;
    const amountSun = Math.floor(amountToStake * 1_000_000); // 避免小数

    console.log(`质押全部余额: ${amountToStake.toFixed(6)} TRX (保留 1 TRX)`);

    // 执行质押
    const tx = await tronWeb.transactionBuilder.freezeBalance(
      amountSun,
      3, // 质押期限（天）
      'ENERGY', // 资源类型: "BANDWIDTH" 或 "ENERGY"
      ownerAddress as string,
    );

    const signedTx = await tronWeb.trx.sign(tx);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    console.log('✅ 全额质押成功！交易ID:', result.txid);
    return result;
  } catch (error) {
    console.error('❌ 质押失败:', error);
    throw error;
  }
}

// 执行全额质押
stakeAllEnergy().catch(console.error);
