import { Request, Response } from 'express';
import handleAsync from '../utils/handleAsync';
import Message from '../models/message';

/**
 * 接收消息的控制器
 */
// 添加新Telegram用户
export const receiveMessage = handleAsync(
  async (req: Request, res: Response) => {
    const newMessage = new Message({
      ...req.body,
    });

    const savedMessage = await newMessage.save();

    res.json({
      success: true,
      data: savedMessage,
    });
  },
);
