import { redis } from './redis';
import createDebug from 'debug';

const debug = createDebug('utils:lock');

// Redis 不可用时退化为进程内实现（PM2 主应用 instances: 1）
const localChains = new Map<string, Promise<unknown>>();
const localClaims = new Map<string, number>(); // key → 过期时间戳

const RELEASE_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

async function runLocalLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = localChains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prev.then(() => gate);
  localChains.set(key, tail);

  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (localChains.get(key) === tail) localChains.delete(key);
  }
}

/**
 * 同一 key 串行执行，跨进程互斥。
 * 返回值 undefined 表示等待超时（有别的请求正持有锁），调用方需自行降级处理。
 *
 * @param ttlMs   锁的兜底过期时间，必须大于 fn 的最大耗时
 * @param waitMs  最多排队等待多久
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; waitMs?: number } = {},
): Promise<T | undefined> {
  const { ttlMs = 90_000, waitMs = 20_000 } = opts;

  if (redis) {
    const token = `${process.pid}-${Math.random().toString(36).slice(2)}`;
    const deadline = Date.now() + waitMs;
    let redisUsable = false;
    let acquired = false;

    while (Date.now() < deadline) {
      try {
        const ok = await redis.set(key, token, 'PX', ttlMs, 'NX');
        redisUsable = true;
        if (!ok) {
          await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));
          continue;
        }
        acquired = true;
        try {
          return await fn();
        } finally {
          await redis.eval(RELEASE_LUA, 1, key, token).catch((err: any) => {
            debug('释放锁失败（将随 TTL 过期）:', err?.message);
          });
        }
      } catch (err: any) {
        if (acquired) throw err;
        debug('Redis 锁不可用，退化为进程内串行:', err?.message);
        break;
      }
    }

    // Redis 正常但等不到锁 → 有别的请求正在临界区内，交调用方降级
    if (redisUsable) return undefined;
  }

  return runLocalLock(key, fn);
}

/**
 * 一次性认领 key：首次调用返回 true，TTL 内重复调用返回 false。
 * 用于 webhook 重复投递去重。Redis 异常时按「未认领过」放行，宁可重复也不丢消息。
 */
export async function claimOnce(key: string, ttlMs: number): Promise<boolean> {
  if (redis) {
    try {
      return (await redis.set(key, '1', 'PX', ttlMs, 'NX')) === 'OK';
    } catch (err: any) {
      debug('Redis claim 失败，退化为进程内去重:', err?.message);
    }
  }

  const now = Date.now();
  if (localClaims.size > 5000) {
    for (const [k, expiresAt] of localClaims) {
      if (expiresAt <= now) localClaims.delete(k);
    }
  }
  const expiresAt = localClaims.get(key);
  if (expiresAt !== undefined && expiresAt > now) return false;
  localClaims.set(key, now + ttlMs);
  return true;
}
