import { Request, Response } from 'express';
import Message from '../models/message';
import handleAsync from '../utils/handleAsync';

// Build query based on query parameters
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.messageId) {
    query.messageId = queryParams.messageId; // 精确匹配消息ID
  }

  if (queryParams.bot) {
    query.bot = queryParams.bot; // 精确匹配机器人ID
  }

  if (queryParams.chat) {
    query.chat = queryParams.chat; // 精确匹配聊天ID
  }

  if (queryParams.user) {
    query.user = queryParams.user; // 精确匹配用户ID
  }

  if (queryParams.sender) {
    query.sender = queryParams.sender; // 精确匹配发送者类型
  }

  if (queryParams.content) {
    query.content = { $regex: queryParams.content, $options: 'i' }; // 模糊匹配内容
  }

  if (queryParams.messageType) {
    query.messageType = queryParams.messageType; // 精确匹配消息类型
  }

  if (queryParams.keywords) {
    query.keywords = { $in: queryParams.keywords }; // 关键词匹配
  }

  if (queryParams.startDate && queryParams.endDate) {
    query.date = {
      $gte: new Date(queryParams.startDate),
      $lte: new Date(queryParams.endDate),
    };
  }

  return query;
};

// 获取所有消息
const getMessages = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const messages = await Message.find(query)
    .populate('bot')
    .populate('chat')
    .populate('user')
    .sort('-date')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Message.countDocuments(query);

  res.json({
    success: true,
    data: messages,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 根据 ID 获取消息
const getMessageById = handleAsync(async (req: Request, res: Response) => {
  const message = await Message.findById(req.params.id)
    .populate('bot')
    .populate('chat')
    .populate('user')
    .exec();

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  res.json({
    success: true,
    data: message,
  });
});

// 添加新消息
const addMessage = handleAsync(async (req: Request, res: Response) => {
  const newMessage = new Message({
    ...req.body,
    date: req.body.date || new Date(), // 如果没有提供日期，使用当前时间
  });

  const savedMessage = await newMessage.save();

  res.json({
    success: true,
    data: savedMessage,
  });
});

// 更新消息
const updateMessage = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedMessage = await Message.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  )
    .populate('bot')
    .populate('chat')
    .populate('user')
    .exec();

  if (!updatedMessage) {
    res.status(404);
    throw new Error('Message not found');
  }

  res.json({
    success: true,
    data: updatedMessage,
  });
});

// 删除消息
const deleteMessage = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const message = await Message.findByIdAndDelete(id).exec();

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  res.json({
    success: true,
    data: { message: 'Message deleted successfully' },
  });
});

// 批量删除消息
const deleteMultipleMessages = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Message.deleteMany({
      _id: { $in: ids },
    }).exec();

    res.json({
      success: true,
      message: `${ids.length} messages deleted successfully`,
    });
  },
);

export {
  getMessages,
  getMessageById,
  addMessage,
  updateMessage,
  deleteMessage,
  deleteMultipleMessages,
};
