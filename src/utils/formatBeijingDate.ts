import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 格式化为北京时间的中文日期字符串
 * @param date ISO 字符串、Date 对象或时间戳
 * @returns 格式化后的字符串，如 "2025年6月12日|10:30"
 */
export function formatBeijingDate(date: string | Date | number): string {
  return dayjs(date).tz('Asia/Shanghai').format('YYYY年M月D日|HH:mm');
}
