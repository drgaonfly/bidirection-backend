import { Request, Response } from 'express';
import Chat from '../models/chat';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';
import { io } from '../services/socket';

// Build query based on query parameters
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.message) {
    query.message = { $regex: queryParams.message, $options: 'i' };
  }

  return query;
};

// 获取所有聊天记录
const getChats = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const chats = await Chat.find(query)
    .populate('customer')
    .populate('user')
    .sort('-createdAt') // Sort by creation time in descending order
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  res.json({
    success: true,
    data: chats,
  });
});

// 获取客户与客服的聊天记录
const getChatMessages = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const customerId = req.customer._id;
    const userId = req.query.userId;

    const query = {
      customer: customerId,
      user: userId,
    };

    // 查询数据库获取聊天记录
    const messages = await Chat.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .exec();

    res.json({
      success: true,
      data: messages,
    });
  },
);

// 添加客户与客服的聊天消息
const addChatMessage = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const customerId = req.customer._id;
    const { userId, message } = req.body;

    if (!userId || !message) {
      res.status(400);
      throw new Error('用户ID和消息内容是必需的');
    }

    const newChat = new Chat({
      customer: customerId,
      user: userId,
      message,
      sender: 'customer',
      isRead: false,
    });

    const savedChat = await newChat.save();

    io.emit('chatMessage', savedChat);

    res.json({
      success: true,
      data: savedChat,
    });
  },
);

// 根据 ID 获取聊天记录
const getChatById = handleAsync(async (req: Request, res: Response) => {
  const chat = await Chat.findById(req.params.id).exec();

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json({
    success: true,
    data: chat,
  });
});

// 添加新聊天记录
const addChat = handleAsync(async (req: Request, res: Response) => {
  const newChat = new Chat({
    ...req.body,
  });

  const savedChat = await newChat.save();

  res.json({
    success: true,
    data: savedChat,
  });
});

// 更新聊天记录
const updateChat = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedChat = await Chat.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  ).exec();

  if (!updatedChat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json({
    success: true,
    data: updatedChat,
  });
});

// 删除聊天记录
const deleteChat = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const chat = await Chat.findByIdAndDelete(id).exec();

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json({
    success: true,
    data: { message: 'Chat deleted successfully' },
  });
});

// 批量删除聊天记录
const deleteMultipleChats = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  await Chat.deleteMany({
    _id: { $in: ids },
  }).exec();

  res.json({
    success: true,
    message: `${ids.length} chats deleted successfully`,
  });
});

export {
  getChats,
  getChatById,
  addChat,
  updateChat,
  deleteChat,
  deleteMultipleChats,
  getChatMessages,
  addChatMessage,
};
