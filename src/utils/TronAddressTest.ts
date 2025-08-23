/**
 * 判断 Tron 地址格式是否正确
 * @param address 要校验的地址字符串
 * @returns {boolean} 是否为有效的 Tron 地址
 */
export function isValidTronAddress(address: string): boolean {
  // Tron 地址以 T 开头，后面跟 33 个字母或数字（共 34 位）
  return /^T[a-zA-Z0-9]{33}$/.test(address);
}
