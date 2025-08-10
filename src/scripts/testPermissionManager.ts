#!/usr/bin/env ts-node

/**
 * TRON 权限管理器测试脚本
 * 用于测试账户权限检查和管理功能
 */

import {
  checkAccountPermission,
  setupAccountPermission,
  getAccountPermissions,
  verifyPermissionSetup,
} from '../utils/tronPermissionManager';

// 测试配置
const TEST_CONFIG = {
  // 请替换为实际的测试地址
  energyAddress: 'TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // B 地址（放能量的地址）
  fromAddress: 'TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // A 地址（有私钥的地址）
  adminPrivateKey: 'your_private_key_here', // A 地址的私钥（测试时请使用安全的私钥）
};

async function testPermissionManager() {
  console.log('🚀 开始测试 TRON 权限管理器...\n');

  try {
    // 测试 1: 获取账户权限信息
    console.log('📋 测试 1: 获取账户权限信息');
    console.log('='.repeat(50));

    const permissions = await getAccountPermissions(TEST_CONFIG.energyAddress);
    console.log('账户权限信息:', JSON.stringify(permissions, null, 2));
    console.log('');

    // 测试 2: 检查权限
    console.log('🔍 测试 2: 检查账户权限');
    console.log('='.repeat(50));

    const hasPermission = await checkAccountPermission(
      TEST_CONFIG.energyAddress,
      TEST_CONFIG.fromAddress,
    );

    console.log(
      `A 地址 ${TEST_CONFIG.fromAddress} 是否有 B 地址 ${
        TEST_CONFIG.energyAddress
      } 的权限: ${hasPermission ? '✅ 是' : '❌ 否'}`,
    );
    console.log('');

    // 测试 3: 设置权限（如果需要）
    if (!hasPermission) {
      console.log('⚙️  测试 3: 设置账户权限');
      console.log('='.repeat(50));

      const setupResult = await setupAccountPermission(
        TEST_CONFIG.adminPrivateKey,
        TEST_CONFIG.energyAddress,
      );

      console.log('权限设置结果:', JSON.stringify(setupResult, null, 2));
      console.log('');

      // 测试 4: 验证权限设置
      if (setupResult.success) {
        console.log('✅ 测试 4: 验证权限设置');
        console.log('='.repeat(50));

        const verified = await verifyPermissionSetup(
          TEST_CONFIG.energyAddress,
          TEST_CONFIG.fromAddress,
          5, // 最大重试 5 次
          3000, // 每次重试间隔 3 秒
        );

        console.log(`权限设置验证结果: ${verified ? '✅ 成功' : '❌ 失败'}`);
      }
    } else {
      console.log('✅ A 地址已有 B 地址的权限，无需设置');
    }

    console.log('\n🎉 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    process.exit(1);
  }
}

// 主函数
async function main() {
  // 检查配置
  if (
    TEST_CONFIG.energyAddress ===
      'TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' ||
    TEST_CONFIG.fromAddress === 'TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' ||
    TEST_CONFIG.adminPrivateKey === 'your_private_key_here'
  ) {
    console.error('❌ 请先配置测试参数！');
    console.error('请编辑 TEST_CONFIG 对象，填入实际的测试地址和私钥');
    process.exit(1);
  }

  // 运行测试
  await testPermissionManager();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { testPermissionManager };
