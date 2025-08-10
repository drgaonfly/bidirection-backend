# TRON 账户权限设置指南

## 概述

本系统实现了 TRON 区块链上的多签权限管理，允许 A 地址（有私钥的地址）代表 B 地址（放能量的地址）进行能量租赁操作。

## 架构说明

- **A 地址**：拥有私钥的地址，用于签名交易
- **B 地址**：放能量的地址，需要将权限授权给 A 地址
- **权限机制**：通过 TRON 的 `activePermission` 系统实现

## 权限设置步骤

### 方法 1：使用 TronLink 钱包（推荐）

1. **登录 B 地址**

   - 使用 TronLink 钱包登录 B 地址（放能量的地址）

2. **进入账户权限设置**

   - 点击钱包右上角的设置图标
   - 选择"账户权限"

3. **添加 A 地址为 activePermission**

   - 点击"添加权限"
   - 权限名称：`active`
   - 权限类型：`Active`
   - 添加 A 地址（有私钥的地址）
   - 设置权重：`1`
   - 设置阈值：`1`

4. **确认设置**
   - 点击"确认"并广播交易
   - 等待交易确认

### 方法 2：使用 TRON 官方 API

如果需要通过代码自动设置权限，可以使用 TRON 的 `accountPermissionUpdate` 合约：

```typescript
import { TronWeb } from 'tronweb';

async function setupPermission(
  adminPrivateKey: string,
  energyAddress: string,
  fromAddress: string,
) {
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: adminPrivateKey,
  });

  // 构建权限更新交易
  const transaction = await tronWeb.transactionBuilder.accountPermissionUpdate(
    energyAddress,
    {
      master_weight: 0,
      active_permission: [
        {
          type: 'Active',
          id: 2,
          permission_name: 'active',
          threshold: 1,
          operations:
            '7fff1fc0033e0000000000000000000000000000000000000000000000000000',
          keys: [
            {
              address: fromAddress,
              weight: 1,
            },
          ],
        },
      ],
    },
  );

  const signedTx = await tronWeb.trx.sign(transaction);
  const result = await tronWeb.trx.sendRawTransaction(signedTx);

  return result;
}
```

## 验证权限设置

使用系统提供的验证函数检查权限是否设置成功：

```typescript
import { checkAccountPermission } from './utils/tronPermissionManager';

const hasPermission = await checkAccountPermission(
  energyAddress, // B 地址
  fromAddress, // A 地址
);

if (hasPermission) {
  console.log('权限设置成功！');
} else {
  console.log('权限设置失败，请检查设置步骤');
}
```

## 使用场景

### 能量租赁

设置权限后，A 地址可以代表 B 地址进行能量租赁：

```typescript
// 使用 B 地址作为 from_address，但用 A 的私钥签名
const transaction = await tronWeb.transactionBuilder.delegateResource(
  amountSun, // 租赁的 TRX 数量
  toAddress, // 接收能量的地址
  'ENERGY', // 资源类型
  energyAddress, // B 地址（放能量的地址）
);

// 用 A 的私钥签名（因为 B 授权给了 A）
const signedTx = await tronWeb.trx.sign(transaction);
const result = await tronWeb.trx.sendRawTransaction(signedTx);
```

### 其他操作

同样的权限机制可以用于：

- 转账操作
- 合约调用
- 资源管理
- 其他需要签名的操作

## 安全注意事项

1. **私钥安全**

   - A 地址的私钥必须安全保管
   - 不要将私钥暴露在代码中
   - 使用环境变量或加密存储

2. **权限控制**

   - 只给必要的权限
   - 定期检查权限设置
   - 及时撤销不需要的权限

3. **监控和日志**
   - 记录所有权限操作
   - 监控异常交易
   - 设置告警机制

## 故障排除

### 常见问题

1. **权限检查失败**

   - 确认 B 地址是否正确
   - 检查 A 地址是否已添加到 activePermission
   - 验证权限权重和阈值设置

2. **交易签名失败**

   - 确认 A 地址有 B 地址的权限
   - 检查私钥是否正确
   - 验证账户余额是否充足

3. **权限设置失败**
   - 检查 B 地址是否有足够的 TRX 支付手续费
   - 确认网络连接正常
   - 查看交易状态和错误信息

### 调试方法

使用系统提供的调试函数：

```typescript
import { getAccountPermissions } from './utils/tronPermissionManager';

const permissions = await getAccountPermissions(energyAddress);
console.log('账户权限信息:', permissions);
```

## 相关文件

- `src/utils/tronPermissionManager.ts` - 权限管理核心功能
- `src/utils/fetchTransactions.ts` - 交易处理逻辑
- `docs/TRON_PERMISSION_SETUP.md` - 本文档

## 技术支持

如果遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看系统日志和错误信息
3. 联系技术支持团队
