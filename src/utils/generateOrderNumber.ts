import crypto from 'crypto';
import Payment from '../models/payment';

export async function generateOrderNumber(): Promise<string> {
  // 生成14位日期时间（UTC时间，格式：YYYYMMDDHHMMSS）
  const datePart = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '') // 移除非数字字符（-、T、:等）
    .slice(0, 14); // 取前14位：年月日时分秒

  let orderNumber: string;
  let retryCount = 0;
  const maxRetries = 5;

  const idSuffix = crypto
    .randomBytes(8) // 生成4字节随机数据
    .toString('hex') // 转为16进制字符串
    .slice(0, 8) // 取固定4位
    .toUpperCase(); // 转为大写

  do {
    // 组合完整订单号（示例：20230921143045A3B8X7Y9）
    orderNumber = `${datePart}${idSuffix}`;

    // 检查唯一性（建议为orderNumber字段添加唯一索引）
    const exists = await Payment.findOne({ orderNumber });
    if (!exists) return orderNumber;

    retryCount++;
  } while (retryCount < maxRetries);

  throw new Error('订单号生成冲突，请重试');
}
