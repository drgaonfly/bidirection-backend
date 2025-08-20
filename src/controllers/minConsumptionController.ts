import { Request, Response } from 'express';
import MinConsumption from '../models/minConsumption';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';
import PackageOrder from '../models/packageOrder';
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

  // tx_id
  if (queryParams.tx_id) {
    query.tx_id = queryParams.tx_id;
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

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  if (queryParams.packageOrder) {
    query.packageOrder = queryParams.packageOrder;
  }

  if (queryParams.packageOrder) {
    const ordertData = await PackageOrder.find({
      id: queryParams.packageOrder,
    });

    if (ordertData && ordertData.length > 0) {
      query.packageOrder = { $in: ordertData.map((o) => o._id) };
    } else {
      query.packageOrder = null;
    }
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

export const getMinConsumptions = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const minConsumptions = await MinConsumption.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .populate('packageUsageRecord')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await MinConsumption.countDocuments(query).exec();

    res.json({
      success: true,
      data: minConsumptions,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getMinConsumptionById = handleAsync(
  async (req: Request, res: Response) => {
    const minConsumption = await MinConsumption.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .populate('packageOrder')
      .lean();

    if (!minConsumption) {
      res.status(404);
      throw new Error('低消记录未找到');
    }

    res.json({
      success: true,
      data: minConsumption,
    });
  },
);

export const addMinConsumption = handleAsync(
  async (req: Request, res: Response) => {
    // No id field in minConsumption, so skip IdGen
    const minConsumption = new MinConsumption({
      ...req.body,
      createdAt: new Date(),
    });

    const savedMinConsumption = await minConsumption.save();

    res.status(201).json({
      success: true,
      data: savedMinConsumption,
    });
  },
);

export const updateMinConsumption = handleAsync(
  async (req: Request, res: Response) => {
    const minConsumption = await MinConsumption.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!minConsumption) {
      res.status(404);
      throw new Error('低消记录未找到');
    }

    res.json({
      success: true,
      data: minConsumption,
    });
  },
);

export const deleteMinConsumption = handleAsync(
  async (req: Request, res: Response) => {
    const minConsumption = await MinConsumption.deleteOne({
      _id: req.params.id,
    });

    if (!minConsumption) {
      res.status(404);
      throw new Error('低消记录未找到');
    }

    res.json({
      success: true,
      message: '低消记录已删除',
    });
  },
);

export const deleteMultipleMinConsumptions = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await MinConsumption.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '低消记录批量删除成功',
    });
  },
);
