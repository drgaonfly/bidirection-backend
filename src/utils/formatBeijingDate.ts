import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatBeijingDate(date: string | Date | number): string {
  // 如果是数字并且可能是秒单位，则转为毫秒
  const timestamp =
    typeof date === 'number' && date < 1e12 ? date * 1000 : date;

  return dayjs(timestamp).tz('Asia/Shanghai').format('YYYY年M月D日|HH:mm');
}
