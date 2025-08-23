import { Request, Response } from 'express';
import EnergySend from '../models/energySend';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';
import User from '../models/user';
import BotUser from '../models/botUser';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import { resendEnergy } from '../utils/fetchTransactions';

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

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.from_address) {
    query.from_address = queryParams.from_address;
  }

  if (queryParams.to_address) {
    query.to_address = queryParams.to_address;
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

export const getEnergySends = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const energySends = await EnergySend.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await EnergySend.countDocuments(query).exec();

    res.json({
      success: true,
      data: energySends,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getEnergySendById = handleAsync(
  async (req: Request, res: Response) => {
    const energySend = await EnergySend.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .lean();

    if (!energySend) {
      res.status(404);
      throw new Error('能量发送记录未找到');
    }

    res.json({
      success: true,
      data: energySend,
    });
  },
);

export const addEnergySend = handleAsync(
  async (req: Request, res: Response) => {
    // No id field in energySend, so no IdGen
    const energySend = new EnergySend({
      ...req.body,
      createdAt: new Date(),
    });

    const savedEnergySend = await energySend.save();

    res.status(201).json({
      success: true,
      data: savedEnergySend,
    });
  },
);

export const updateEnergySend = handleAsync(
  async (req: Request, res: Response) => {
    const energySend = await EnergySend.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!energySend) {
      res.status(404);
      throw new Error('能量发送记录未找到');
    }

    res.json({
      success: true,
      data: energySend,
    });
  },
);

export const deleteEnergySend = handleAsync(
  async (req: Request, res: Response) => {
    const energySend = await EnergySend.deleteOne({
      _id: req.params.id,
    });

    if (!energySend) {
      res.status(404);
      throw new Error('能量发送记录未找到');
    }

    res.json({
      success: true,
      message: '能量发送记录已删除',
    });
  },
);

export const deleteMultipleEnergySends = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await EnergySend.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '能量发送记录批量删除成功',
    });
  },
);

export const resendEnergyById = handleAsync(
  async (req: Request, res: Response) => {
    console.log('req.params', req.params);

    const energySend = await EnergySend.findByIdAndUpdate(req.params.id);

    if (!energySend) {
      res.status(404);
      throw new Error('能量发送记录未找到');
    }

    await resendEnergy(energySend);

    res.json({
      success: true,
      data: energySend,
    });
  },
);
