import { Request, Response } from 'express';
import TgStarsOrder from '../models/tgStarsOrder';
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

export const getTgStarsOrders = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const tgStarsOrders = await TgStarsOrder.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)

      .lean()
      .exec();

    const total = await TgStarsOrder.countDocuments(query).exec();

    res.json({
      success: true,
      data: tgStarsOrders,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getTgStarsOrderById = handleAsync(
  async (req: Request, res: Response) => {
    const tgStarsOrder = await TgStarsOrder.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!tgStarsOrder) {
      res.status(404);
      throw new Error('TG Stars订单未找到');
    }

    res.json({
      success: true,
      data: tgStarsOrder,
    });
  },
);

export const createTgStarsOrder = handleAsync(
  async (req: Request, res: Response) => {
    const tgStarsOrder = new TgStarsOrder({
      ...req.body,
      createdAt: new Date(),
    });

    const savedTgStarsOrder = await tgStarsOrder.save();

    res.status(201).json({
      success: true,
      data: savedTgStarsOrder,
    });
  },
);

export const updateTgStarsOrder = handleAsync(
  async (req: Request, res: Response) => {
    const tgStarsOrder = await TgStarsOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!tgStarsOrder) {
      res.status(404);
      throw new Error('TG Stars订单未找到');
    }

    res.json({
      success: true,
      data: tgStarsOrder,
    });
  },
);

export const deleteTgStarsOrder = handleAsync(
  async (req: Request, res: Response) => {
    const tgStarsOrder = await TgStarsOrder.deleteOne({
      _id: req.params.id,
    });

    if (!tgStarsOrder) {
      res.status(404);
      throw new Error('TG Stars订单未找到');
    }

    res.json({
      success: true,
      message: 'TG Stars订单已删除',
    });
  },
);

export const deleteMultipleTgStarsOrders = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await TgStarsOrder.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: 'TG Stars订单批量删除成功',
    });
  },
);
