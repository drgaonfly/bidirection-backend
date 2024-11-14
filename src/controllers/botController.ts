import { Request, Response } from 'express';
import Bot from '../models/bot';
import handleAsync from '../utils/handleAsync';

// Build query based on query parameters
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  // 遍历所有可能的查询字段
  if (queryParams.botId) {
    query.botId = { $regex: queryParams.botId, $options: 'i' };
  }

  if (queryParams.botToken) {
    query.botToken = { $regex: queryParams.botToken, $options: 'i' };
  }

  if (queryParams.botUsername) {
    query.botUsername = { $regex: queryParams.botUsername, $options: 'i' };
  }

  if (queryParams.botName) {
    query.botName = { $regex: queryParams.botName, $options: 'i' };
  }

  if (queryParams.telegramId) {
    query.telegramId = { $regex: queryParams.telegramId, $options: 'i' };
  }

  if (queryParams.telegramUsername) {
    query.telegramUsername = {
      $regex: queryParams.telegramUsername,
      $options: 'i',
    };
  }

  if (queryParams.description) {
    query.description = { $regex: queryParams.description, $options: 'i' };
  }

  return query;
};

// 获取所有机器人
const getBots = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const bots = await Bot.find(query)
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Bot.countDocuments(query);

  res.json({
    success: true,
    data: bots,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 根据 ID 获取机器人
const getBotById = handleAsync(async (req: Request, res: Response) => {
  const bot = await Bot.findById(req.params.id).exec();

  if (!bot) {
    res.status(404);
    throw new Error('Bot not found');
  }

  res.json({
    success: true,
    data: bot,
  });
});

// 添加新机器人
const addBot = handleAsync(async (req: Request, res: Response) => {
  const newBot = new Bot({
    ...req.body,
  });

  const savedBot = await newBot.save();

  res.json({
    success: true,
    data: savedBot,
  });
});

// 更新机器人
const updateBot = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedBot = await Bot.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  ).exec();

  if (!updatedBot) {
    res.status(404);
    throw new Error('Bot not found');
  }

  res.json({
    success: true,
    data: updatedBot,
  });
});

// 删除机器人
const deleteBot = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const bot = await Bot.findByIdAndDelete(id).exec();

  if (!bot) {
    res.status(404);
    throw new Error('Bot not found');
  }

  res.json({
    success: true,
    data: { message: 'Bot deleted successfully' },
  });
});

// 批量删除机器人
const deleteMultipleBots = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  await Bot.deleteMany({
    _id: { $in: ids },
  }).exec();

  res.json({
    success: true,
    message: `${ids.length} bots deleted successfully`,
  });
});

export {
  getBots,
  getBotById,
  addBot,
  updateBot,
  deleteBot,
  deleteMultipleBots,
};
