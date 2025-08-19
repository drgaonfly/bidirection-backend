import { Request, Response } from 'express';
import EnergyUsage from '../models/energyUsage';
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

  // packageUsageRecord (by id)
  if (queryParams.packageUsageRecord) {
    query.packageUsageRecord = queryParams.packageUsageRecord;
  }

  // address
  if (queryParams.address) {
    query.address = queryParams.address;
  }

  // owner
  if (queryParams.owner) {
    query.owner = queryParams.owner;
  }

  // tx_id
  if (queryParams.tx_id) {
    query.tx_id = queryParams.tx_id;
  }

  // bot (by botName, via PackageUsageRecord)
  if (queryParams.bot) {
    const botData = await Bot.find({
      botName: {
        $regex: queryParams.bot,
        $options: 'i',
      },
    });
    if (botData && botData.length > 0) {
      // Find PackageUsageRecords with these bots
      const botIds = botData.map((bot) => bot._id);
      // We assume packageUsageRecord has a bot field
      query['packageUsageRecord.bot'] = { $in: botIds };
    } else {
      query['packageUsageRecord.bot'] = null;
    }
  }

  // botUser (by userName, via PackageUsageRecord)
  if (queryParams.botUser) {
    const botUsers = await BotUser.find({
      userName: {
        $regex: queryParams.botUser,
        $options: 'i',
      },
    });
    if (botUsers && botUsers.length > 0) {
      const botUserIds = botUsers.map((botUser) => botUser._id);
      query['packageUsageRecord.botUser'] = { $in: botUserIds };
    } else {
      query['packageUsageRecord.botUser'] = null;
    }
  }

  // 代理查询逻辑 (proxy, via PackageUsageRecord)
  if (queryParams.proxy) {
    query['packageUsageRecord.proxy'] = queryParams.proxy;
  }

  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query['packageUsageRecord.proxy'] = { $in: [...employeeIds, req.user._id] };
  }

  if (isEmployee(req.user)) {
    query['packageUsageRecord.proxy'] = req.user._id;
  }

  return query;
};

export const getEnergyUsages = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const energyUsages = await EnergyUsage.find(query)
      .populate({
        path: 'packageUsageRecord',
        populate: [{ path: 'botUser' }, { path: 'bot' }, { path: 'proxy' }],
      })
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await EnergyUsage.countDocuments(query).exec();

    res.json({
      success: true,
      data: energyUsages,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getEnergyUsageById = handleAsync(
  async (req: Request, res: Response) => {
    const energyUsage = await EnergyUsage.findOne({
      _id: req.params.id,
    })
      .populate({
        path: 'packageUsageRecord',
        populate: [{ path: 'botUser' }, { path: 'bot' }, { path: 'proxy' }],
      })
      .lean();

    if (!energyUsage) {
      res.status(404);
      throw new Error('能量使用记录未找到');
    }

    res.json({
      success: true,
      data: energyUsage,
    });
  },
);

export const addEnergyUsage = handleAsync(
  async (req: Request, res: Response) => {
    const energyUsage = new EnergyUsage({
      ...req.body,
      createdAt: new Date(),
    });

    const savedEnergyUsage = await energyUsage.save();

    res.status(201).json({
      success: true,
      data: savedEnergyUsage,
    });
  },
);

export const updateEnergyUsage = handleAsync(
  async (req: Request, res: Response) => {
    const energyUsage = await EnergyUsage.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!energyUsage) {
      res.status(404);
      throw new Error('能量使用记录未找到');
    }

    res.json({
      success: true,
      data: energyUsage,
    });
  },
);

export const deleteEnergyUsage = handleAsync(
  async (req: Request, res: Response) => {
    const energyUsage = await EnergyUsage.deleteOne({
      _id: req.params.id,
    });

    if (!energyUsage) {
      res.status(404);
      throw new Error('能量使用记录未找到');
    }

    res.json({
      success: true,
      message: '能量使用记录已删除',
    });
  },
);

export const deleteMultipleEnergyUsages = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await EnergyUsage.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '能量使用记录批量删除成功',
    });
  },
);
