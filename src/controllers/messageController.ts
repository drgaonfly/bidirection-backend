import { Request, Response } from 'express';
import Message from '../models/message';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import User from '../models/user';

// 构建查询参数
const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  // messageType
  if (queryParams.messageType) {
    query.messageType = queryParams.messageType;
  }

  // chat_type
  if (queryParams.chat_title) {
    query.chat_title = queryParams.chat_title;
  }

  // chat_id
  if (queryParams.username) {
    query.username = queryParams.username;
  }

  // botName
  if (queryParams.botName) {
    query.botName = queryParams.botName;
  }

  // 代理查询逻辑
  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.proxy = { $in: [req.user._id, ...employeeIds] };
  } else if (isEmployee(req.user)) {
    query.proxy = req.user.proxy;
  }

  return query;
};

// 获取所有消息
const getMessages = handleAsync(async (req: RequestCustom, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query, req);

  const messages = await Message.find(query)
    .sort('-date')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Message.countDocuments(query).exec();

  res.json({
    success: true,
    data: messages,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 获取消息详情
const getMessageById = handleAsync(async (req: Request, res: Response) => {
  const message = await Message.findById(req.params.id).exec();

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  res.json({
    success: true,
    data: message,
  });
});

export { getMessages, getMessageById };
