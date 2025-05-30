import { Request, Response } from 'express';
import BotMessage from '../models/botMessage';
import Group from '../models/group';
import BotUser from '../models/botUser';
import Bot from '../models/bot';
import handleAsync from '../utils/handleAsync';

// 构建查询参数
const buildQuery = async (queryParams: any) => {
  const query: any = {};

  // messageType
  if (queryParams.messageType) {
    query.messageType = queryParams.messageType;
  }

  if (queryParams.bot) {
    const botData = await Bot.find({
      botName: {
        $regex: queryParams.bot,
        $options: 'i',
      },
    });

    if (botData && botData.length > 0) {
      query.bot = { $in: botData.map((bot) => bot._id) };
    } else {
      query.bot = null;
    }
  }

  if (queryParams.group) {
    const groupData = await Group.find({
      title: {
        $regex: queryParams.group,
        $options: 'i',
      },
    });

    if (groupData && groupData.length > 0) {
      query.group = { $in: groupData.map((group) => group._id) };
    } else {
      query.group = null;
    }
  }

  // botUser下的userName
  if (queryParams.botUser) {
    const botUsers = await BotUser.find({
      userName: {
        $regex: queryParams.botUser,
        $options: 'i',
      },
    });

    if (botUsers && botUsers.length > 0) {
      query.botUser = { $in: botUsers.map((botUser) => botUser._id) };
    } else {
      query.botUser = null;
    }
  }

  return query;
};

// 获取所有消息
const getBotMessages = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query);

  const messages = await BotMessage.find(query)
    .populate('bot')
    .populate('group')
    .populate('botUser')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await BotMessage.countDocuments(query).exec();

  res.json({
    success: true,
    data: messages,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 获取消息详情
const getBotMessageById = handleAsync(async (req: Request, res: Response) => {
  const message = await BotMessage.findById(req.params.id)
    .populate('bot')
    .populate('group')
    .populate('botUser')
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

export { getBotMessages, getBotMessageById };
