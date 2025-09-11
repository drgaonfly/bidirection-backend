import { Request, Response } from 'express';
import Star from '../models/star';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';
import BotUser from '../models/botUser';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import User from '../models/user';

const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.orderNumber) {
    query.orderNumber = { $regex: queryParams.orderNumber, $options: 'i' };
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

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  // 代理查询逻辑
  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.proxy = { $in: [...employeeIds, req.user._id] };
  }

  if (isEmployee(req.user)) {
    query.proxy = req.user._id;
  }

  return query;
};

export const getStars = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const stars = await Star.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)

      .lean()
      .exec();

    const total = await Star.countDocuments(query).exec();

    res.json({
      success: true,
      data: stars,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getStarById = handleAsync(async (req: Request, res: Response) => {
  const star = await Star.findOne({
    _id: req.params.id,
  })
    .populate('botUser')
    .populate('bot')
    .lean();

  if (!star) {
    res.status(404);
    throw new Error('Stars订单未找到');
  }

  res.json({
    success: true,
    data: star,
  });
});

export const createStar = handleAsync(async (req: Request, res: Response) => {
  const star = new Star({
    ...req.body,
    createdAt: new Date(),
  });

  const savedStar = await star.save();

  res.status(201).json({
    success: true,
    data: savedStar,
  });
});

export const updateStar = handleAsync(async (req: Request, res: Response) => {
  const star = await Star.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!star) {
    res.status(404);
    throw new Error('Stars订单未找到');
  }

  res.json({
    success: true,
    data: star,
  });
});

export const deleteStar = handleAsync(async (req: Request, res: Response) => {
  const star = await Star.deleteOne({
    _id: req.params.id,
  });

  if (!star) {
    res.status(404);
    throw new Error('Stars订单未找到');
  }

  res.json({
    success: true,
    message: 'Stars订单已删除',
  });
});

export const deleteMultipleStars = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Star.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: 'Stars订单批量删除成功',
    });
  },
);
