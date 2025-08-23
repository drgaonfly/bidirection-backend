import { Request, Response } from 'express';
import UnRental from '../models/unrental';
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

  // id
  if (queryParams.id) {
    query.id = queryParams.id;
  }

  // hash
  if (queryParams.hash) {
    query.hash = queryParams.hash;
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

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  if (queryParams.rental) {
    query.rental = queryParams.rental;
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

export const getUnRentals = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const unRentals = await UnRental.find(query)
      .populate('rental')
      .populate('bot')
      .populate('botUser')
      .populate({
        path: 'packageUsageRecord',
        populate: 'packageOrder',
      })
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await UnRental.countDocuments(query).exec();

    res.json({
      success: true,
      data: unRentals,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getUnRentalById = handleAsync(
  async (req: Request, res: Response) => {
    const unRental = await UnRental.findOne({
      _id: req.params.id,
    })
      .populate({
        path: 'rental',
        populate: [{ path: 'botUser' }, { path: 'bot' }, { path: 'proxy' }],
      })
      .populate('proxy')
      .lean();

    if (!unRental) {
      res.status(404);
      throw new Error('解除租赁记录未找到');
    }

    res.json({
      success: true,
      data: unRental,
    });
  },
);

export const addUnRental = handleAsync(async (req: Request, res: Response) => {
  // No id field in UnRental, so no IdGen
  const unRental = new UnRental({
    ...req.body,
    status: req.body.status || 'delegated',
    createdAt: new Date(),
  });

  const savedUnRental = await unRental.save();

  res.status(201).json({
    success: true,
    data: savedUnRental,
  });
});

export const updateUnRental = handleAsync(
  async (req: Request, res: Response) => {
    const unRental = await UnRental.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!unRental) {
      res.status(404);
      throw new Error('解除租赁记录未找到');
    }

    res.json({
      success: true,
      data: unRental,
    });
  },
);

export const deleteUnRental = handleAsync(
  async (req: Request, res: Response) => {
    const unRental = await UnRental.deleteOne({
      _id: req.params.id,
    });

    if (!unRental) {
      res.status(404);
      throw new Error('解除租赁记录未找到');
    }

    res.json({
      success: true,
      message: '解除租赁记录已删除',
    });
  },
);

export const deleteMultipleUnRentals = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await UnRental.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '解除租赁记录批量删除成功',
    });
  },
);

export const reRecycle = handleAsync(async (req: Request, res: Response) => {
  const unRental = await UnRental.findByIdAndUpdate(req.params.id);

  if (!unRental) {
    res.status(404);
    throw new Error('解除租赁记录未找到');
  }

  res.json({
    success: true,
    data: unRental,
  });
});
