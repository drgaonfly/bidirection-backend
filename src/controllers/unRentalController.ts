import { Request, Response } from 'express';
import UnRental from '../models/unrental';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';
import BotUser from '../models/botUser';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import User from '../models/user';
import {
  unRentEnergy,
  genericRecycleEnergyByAmount,
  resendEnergy,
} from '../utils/fetchTransactions';
import PackageUsageRecord from '../models/packageUsageRecord';
import Rental from '../models/rental';
import EnergySend from '../models/energySend';
import PackageOrder from '../models/packageOrder';

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
  try {
    const unRental = await UnRental.findById(req.params.id)
      .populate('rental')
      .populate({
        path: 'packageUsageRecord',
        populate: 'packageOrder',
      });

    if (!unRental) {
      res.status(404);
      throw new Error('解除租赁记录未找到');
    }

    // 检查是否已经成功处理过
    if (unRental.status === 'success') {
      throw new Error('该记录已经成功处理过，请勿重复操作');
    }

    let txid;
    let energySend;

    try {
      if (unRental.rental) {
        const rental = await Rental.findById(unRental.rental);
        if (!rental) {
          throw new Error('找不到关联的租赁记录');
        }

        energySend = await EnergySend.findOne({
          rental: rental._id,
        });
        if (!energySend) {
          throw new Error('找不到关联的能量发送记录');
        }

        // 如果是租赁记录，使用 unRentEnergy
        txid = await unRentEnergy(rental);

        // 重新发送能量
        await resendEnergy(energySend);
      } else if (unRental.packageUsageRecord) {
        // 如果是套餐使用记录，使用 genericRecycleEnergyByAmount
        const record = await PackageUsageRecord.findById(
          unRental.packageUsageRecord,
        );
        if (!record) {
          throw new Error('找不到关联的套餐使用记录');
        }

        energySend = await EnergySend.findOne({
          packageUsageRecord: record._id,
        });
        if (!energySend) {
          throw new Error('找不到关联的能量发送记录');
        }

        txid = await genericRecycleEnergyByAmount(
          unRental.amount,
          record.address,
          record,
          unRental.separation,
          'reRecycle',
        );

        // 重新发送能量
        await resendEnergy(energySend);

        // 扣减套餐使用记录
        const updatedPackageOrder = await PackageOrder.findByIdAndUpdate(
          record.packageOrder,
          {
            $inc: { current_times: -unRental.separation },
          },
          { new: true },
        );
        if (!updatedPackageOrder) {
          throw new Error('套餐订单更新失败');
        }
      } else {
        throw new Error('无效的解除租赁记录类型');
      }

      // 更新 unRental 记录
      unRental.hash = txid;
      unRental.status = 'success';
      await unRental.save();

      res.json({
        success: true,
        data: unRental,
      });
    } catch (error) {
      // 操作失败，更新状态为失败
      unRental.status = 'failed';
      unRental.error = error.message;
      await unRental.save();

      throw error; // 继续向上抛出错误
    }
  } catch (error) {
    res.status(error.status || 500);
    throw new Error(`重新回收能量失败: ${error.message}`);
  }
});
