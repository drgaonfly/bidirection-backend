import { Request, Response } from 'express';
import crypto from 'crypto';
import Bot from '../models/bot';
import BotUser from '../models/botUser';
import createDebug from 'debug';

const debug = createDebug('mini-app');

// ─────────────────────────────────────────────────────────────
// Telegram initData 验证
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ─────────────────────────────────────────────────────────────
function verifyInitData(
  initData: string,
  botToken: string,
): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // 按字母排序后拼成 data_check_string
    const checkString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (expectedHash !== hash) return null;

    // 返回解析后的数据
    const result: Record<string, string> = {};
    params.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/mini-app/config
// Header: x-init-data: <Telegram initData>
// Header: x-bot-id: <bot MongoDB _id>
// ─────────────────────────────────────────────────────────────
export const getConfig = async (req: Request, res: Response) => {
  const initData = req.headers['x-init-data'] as string;
  const botId = req.headers['x-bot-id'] as string;

  if (!initData || !botId) {
    return res.status(400).json({ message: '缺少必要参数' });
  }

  const bot = await Bot.findById(botId)
    .select('token message medias buttons owner')
    .lean();
  if (!bot) return res.status(404).json({ message: '机器人不存在' });

  // 用 bot 自己的 token 验证 initData
  const data = verifyInitData(initData, bot.token);
  if (!data) return res.status(401).json({ message: 'initData 验证失败' });

  // 验证发起者是 bot 的 owner
  const telegramUserId = JSON.parse(data.user || '{}').id;
  const ownerBotUser = await BotUser.findById(bot.owner).lean();
  if (!ownerBotUser || String(ownerBotUser.id) !== String(telegramUserId)) {
    return res.status(403).json({ message: '无权限' });
  }

  debug('getConfig botId=%s userId=%s', botId, telegramUserId);

  return res.json({
    message: bot.message || '',
    medias: bot.medias || [],
    buttons: bot.buttons || [],
  });
};

// ─────────────────────────────────────────────────────────────
// POST /api/mini-app/config
// ─────────────────────────────────────────────────────────────
export const saveConfig = async (req: Request, res: Response) => {
  const initData = req.headers['x-init-data'] as string;
  const botId = req.headers['x-bot-id'] as string;

  if (!initData || !botId) {
    return res.status(400).json({ message: '缺少必要参数' });
  }

  const bot = await Bot.findById(botId).select('token owner').lean();
  if (!bot) return res.status(404).json({ message: '机器人不存在' });

  const data = verifyInitData(initData, bot.token);
  if (!data) return res.status(401).json({ message: 'initData 验证失败' });

  const telegramUserId = JSON.parse(data.user || '{}').id;
  const ownerBotUser = await BotUser.findById(bot.owner).lean();
  if (!ownerBotUser || String(ownerBotUser.id) !== String(telegramUserId)) {
    return res.status(403).json({ message: '无权限' });
  }

  const { message, medias, buttons } = req.body;

  const updateData: any = {};
  if (message !== undefined) updateData.message = message;
  if (medias !== undefined) updateData.medias = medias;
  if (buttons !== undefined) updateData.buttons = buttons;

  await Bot.findByIdAndUpdate(botId, updateData);

  debug('saveConfig botId=%s', botId);
  return res.json({ success: true });
};
