import { Request, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import Bot from '../models/bot';
import BotUser from '../models/botUser';
import createDebug from 'debug';

const debug = createDebug('mini-app');
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

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
      .createHmac('sha256', new Uint8Array(secretKey))
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
    .select('token message medias buttons autoReplies owner')
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
    autoReplies: bot.autoReplies || [],
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

  const { message, medias, buttons, autoReplies } = req.body;

  const updateData: any = {};
  if (message !== undefined) updateData.message = message;
  if (medias !== undefined) updateData.medias = medias;
  if (buttons !== undefined) updateData.buttons = buttons;
  if (autoReplies !== undefined) updateData.autoReplies = autoReplies;

  await Bot.findByIdAndUpdate(botId, updateData);

  debug('saveConfig botId=%s', botId);
  return res.json({ success: true });
};

// ─────────────────────────────────────────────────────────────
// POST /api/mini-app/upload
// multipart/form-data: file, initData, botId
// 将文件转发给 Telegram，返回 file_id
// ─────────────────────────────────────────────────────────────
export const uploadMedia = async (req: Request, res: Response) => {
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

  const file = (req as any).file;
  if (!file) return res.status(400).json({ message: '未收到文件' });

  const mime = file.mimetype || '';
  let mediaType: 'photo' | 'video' | 'document';
  let apiMethod: string;

  if (mime.startsWith('image/')) {
    mediaType = 'photo';
    apiMethod = 'sendPhoto';
  } else if (mime.startsWith('video/')) {
    mediaType = 'video';
    apiMethod = 'sendVideo';
  } else {
    mediaType = 'document';
    apiMethod = 'sendDocument';
  }

  // 用 Telegram Bot API 发送文件给 owner，获取 file_id
  const form = new FormData();
  form.append('chat_id', String(ownerBotUser.id));
  form.append(mediaType, file.buffer, {
    filename: file.originalname || 'file',
    contentType: file.mimetype,
  });
  // 发完立刻删除（发给自己只是为了拿 file_id）
  form.append('disable_notification', 'true');

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${bot.token}/${apiMethod}`,
      { method: 'POST', body: form },
    );
    const tgJson = (await tgRes.json()) as any;
    if (!tgJson.ok) {
      debug('Telegram upload failed:', tgJson);
      return res
        .status(500)
        .json({ message: tgJson.description || '上传失败' });
    }

    const msg = tgJson.result;
    let fileId: string;
    if (mediaType === 'photo') {
      const photos = msg.photo;
      fileId = photos[photos.length - 1].file_id;
    } else if (mediaType === 'video') {
      fileId = msg.video.file_id;
    } else {
      fileId = msg.document.file_id;
    }

    // 删掉刚发的那条消息（保持 owner 聊天整洁）
    fetch(`https://api.telegram.org/bot${bot.token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerBotUser.id,
        message_id: msg.message_id,
      }),
    }).catch(() => {});

    debug('uploadMedia type=%s fileId=%s', mediaType, fileId);
    return res.json({ fileId, type: mediaType });
  } catch (e: any) {
    debug('uploadMedia error:', e.message);
    return res.status(500).json({ message: e.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/mini-app/auto-replies
// ─────────────────────────────────────────────────────────────
export const getAutoReplies = async (req: Request, res: Response) => {
  const initData = req.headers['x-init-data'] as string;
  const botId = req.headers['x-bot-id'] as string;

  if (!initData || !botId) {
    return res.status(400).json({ message: '缺少必要参数' });
  }

  const bot = await Bot.findById(botId)
    .select('token owner autoReplies')
    .lean();
  if (!bot) return res.status(404).json({ message: '机器人不存在' });

  const data = verifyInitData(initData, bot.token);
  if (!data) return res.status(401).json({ message: 'initData 验证失败' });

  const telegramUserId = JSON.parse(data.user || '{}').id;
  const ownerBotUser = await BotUser.findById(bot.owner).lean();
  if (!ownerBotUser || String(ownerBotUser.id) !== String(telegramUserId)) {
    return res.status(403).json({ message: '无权限' });
  }

  debug('getAutoReplies botId=%s', botId);
  return res.json({ autoReplies: bot.autoReplies || [] });
};

// ─────────────────────────────────────────────────────────────
// POST /api/mini-app/auto-replies
// Body: { autoReplies: Array<{ keyword, fuzzy, reply }> }
// ─────────────────────────────────────────────────────────────
export const saveAutoReplies = async (req: Request, res: Response) => {
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

  const { autoReplies } = req.body;
  if (!Array.isArray(autoReplies)) {
    return res.status(400).json({ message: 'autoReplies 必须是数组' });
  }

  await Bot.findByIdAndUpdate(botId, { autoReplies });

  debug('saveAutoReplies botId=%s count=%d', botId, autoReplies.length);
  return res.json({ success: true });
};
