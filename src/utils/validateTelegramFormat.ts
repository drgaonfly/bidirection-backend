// 验证TG用户名格式
export function isValidTelegramFormat(input: string): {
  isValid: boolean;
  username: string;
} {
  // 移除可能的@符号和t.me链接前缀
  let username = input.trim();

  // 处理t.me链接格式
  if (username.includes('t.me/')) {
    username = username.split('t.me/')[1];
  }

  // 移除开头的@符号
  if (username.startsWith('@')) {
    username = username.substring(1);
  }

  // Telegram用户名规则：5-32个字符，只允许字母数字和下划线
  const isValid = /^[a-zA-Z0-9_]{5,32}$/.test(username);

  return { isValid, username };
}
