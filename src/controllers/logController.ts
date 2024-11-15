import { Request, Response } from 'express';
import Log from '../models/log';
import handleAsync from '../utils/handleAsync';

// Build query based on query parameters
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.bot) {
    query.bot = queryParams.bot; // 精确匹配机器人ID
  }

  if (queryParams.level) {
    query.level = queryParams.level; // 精确匹配日志级别
  }

  if (queryParams.message) {
    query.message = { $regex: queryParams.message, $options: 'i' }; // 模糊匹配消息内容
  }

  if (queryParams.startDate && queryParams.endDate) {
    query.timestamp = {
      $gte: new Date(queryParams.startDate),
      $lte: new Date(queryParams.endDate),
    };
  }

  return query;
};

// 获取所有日志
const getLogs = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const logs = await Log.find(query)
    .populate('bot') // 关联查询机器人信息
    .sort('-timestamp') // 按时间戳降序排序
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Log.countDocuments(query);

  res.json({
    success: true,
    data: logs,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 根据 ID 获取日志
const getLogById = handleAsync(async (req: Request, res: Response) => {
  const log = await Log.findById(req.params.id).populate('bot').exec();

  if (!log) {
    res.status(404);
    throw new Error('Log not found');
  }

  res.json({
    success: true,
    data: log,
  });
});

// 添加新日志
const addLog = handleAsync(async (req: Request, res: Response) => {
  const newLog = new Log({
    ...req.body,
    timestamp: req.body.timestamp || new Date(), // 如果没有提供时间戳，使用当前时间
  });

  const savedLog = await newLog.save();

  res.json({
    success: true,
    data: savedLog,
  });
});

// 更新日志
const updateLog = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedLog = await Log.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  )
    .populate('bot')
    .exec();

  if (!updatedLog) {
    res.status(404);
    throw new Error('Log not found');
  }

  res.json({
    success: true,
    data: updatedLog,
  });
});

// 删除日志
const deleteLog = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const log = await Log.findByIdAndDelete(id).exec();

  if (!log) {
    res.status(404);
    throw new Error('Log not found');
  }

  res.json({
    success: true,
    data: { message: 'Log deleted successfully' },
  });
});

// 批量删除日志
const deleteMultipleLogs = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  await Log.deleteMany({
    _id: { $in: ids },
  }).exec();

  res.json({
    success: true,
    message: `${ids.length} logs deleted successfully`,
  });
});

// 清理旧日志
const cleanOldLogs = handleAsync(async (req: Request, res: Response) => {
  const { days = 30 } = req.query; // 默认清理30天前的日志
  const date = new Date();
  date.setDate(date.getDate() - Number(days));

  const result = await Log.deleteMany({
    timestamp: { $lt: date },
  }).exec();

  res.json({
    success: true,
    message: `Cleaned ${result.deletedCount} old logs`,
  });
});

export {
  getLogs,
  getLogById,
  addLog,
  updateLog,
  deleteLog,
  deleteMultipleLogs,
  cleanOldLogs,
};
