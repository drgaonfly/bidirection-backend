import handleAsync from '../utils/handleAsync';
import BotUser from '../models/botUser'; // 引入botUser模型
import User from '../models/user';
import { Request, Response } from 'express';
import { RequestCustom } from 'user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';

// Build query based on query parameters
const buildQuery = async (queryParams: any, req: RequestCustom) => {
  const query: any = {};

  if (queryParams.userName) {
    // 如果用户名以@开头,去掉@符号
    const processedUserName = queryParams.userName.startsWith('@')
      ? queryParams.userName.substring(1)
      : queryParams.userName;
    query.userName = { $regex: processedUserName, $options: 'i' };
  }
  if (queryParams.firstName) {
    query.firstName = { $regex: queryParams.firstName, $options: 'i' };
  }
  if (queryParams.lastName) {
    query.lastName = { $regex: queryParams.lastName, $options: 'i' };
  }
  if (queryParams.bot) {
    query.bot = queryParams.bot;
  }
  // isAuthorized
  if (queryParams.isAuthorized) {
    query.isAuthorized = queryParams.isAuthorized;
  }

  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.user = { $in: [...employeeIds, req.user._id] };
  }

  if (isEmployee(req.user)) {
    query.user = req.user._id;
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  return query;
};

// 获取所有Telegram用户
const getbotUsers = handleAsync(async (req: RequestCustom, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query, req);

  const botUsers = await BotUser.find(query)
    .populate('transactions')
    .populate('payments')
    .populate('subscriptions')
    .populate('bound_proxy')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await BotUser.countDocuments(query).exec();

  res.json({
    success: true,
    data: botUsers,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 根据 ID 获取Telegram用户
const getbotUserById = handleAsync(async (req: Request, res: Response) => {
  const getBotUser = await BotUser.findById(req.params.id)
    .populate('transactions')
    .populate('payments')
    .populate('subscriptions')
    .populate('bound_proxy')
    .exec();

  if (!getBotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: getBotUser,
  });
});

// 添加新Telegram用户
const addbotUser = handleAsync(async (req: Request, res: Response) => {
  const newbotUser = new BotUser({
    ...req.body,
  });

  const savedbotUser = await newbotUser.save();

  res.json({
    success: true,
    data: savedbotUser,
  });
});

// 更新Telegram用户
const updatebotUser = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedbotUser = await BotUser.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  ).exec();

  if (!updatedbotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: updatedbotUser,
  });
});

// 删除Telegram用户
const deletebotUser = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedBotUser = await BotUser.findByIdAndDelete(id).exec();

  if (!deletedBotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: { message: 'botUser deleted successfully' },
  });
});

// 批量删除Telegram用户
const deleteMultiplebotUsers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await BotUser.deleteMany({
      _id: { $in: ids },
    }).exec();

    res.json({
      success: true,
      message: `${ids.length} botUsers deleted successfully`,
    });
  },
);

export {
  getbotUsers,
  getbotUserById,
  addbotUser,
  updatebotUser,
  deletebotUser,
  deleteMultiplebotUsers,
};
