import { Request, Response } from 'express';
import Advance from '../models/advance';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
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

  if (queryParams.from_address) {
    query.from_address = queryParams.from_address;
  }

  if (queryParams.to_address) {
    query.to_address = queryParams.to_address;
  }

  if (queryParams.crypto_type) {
    query.crypto_type = queryParams.crypto_type;
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.amount) {
    query.amount = Number(queryParams.amount);
  }

  if (queryParams.expiredAt) {
    query.expiredAt = queryParams.expiredAt;
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

export const getAdvances = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const advances = await Advance.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)

      .lean()
      .exec();

    const total = await Advance.countDocuments(query).exec();

    res.json({
      success: true,
      data: advances,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getAdvanceById = handleAsync(
  async (req: Request, res: Response) => {
    const advance = await Advance.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      data: advance,
    });
  },
);

export const addAdvance = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Advance, 'id', 6);

  const advance = new Advance({
    ...req.body,
    id: newId,
  });

  const savedAdvance = await advance.save();

  res.status(201).json({
    success: true,
    data: savedAdvance,
  });
});

export const updateAdvance = handleAsync(
  async (req: Request, res: Response) => {
    const advance = await Advance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      data: advance,
    });
  },
);

export const deleteAdvance = handleAsync(
  async (req: Request, res: Response) => {
    const advance = await Advance.deleteOne({
      _id: req.params.id,
    });

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      message: '预支记录已删除',
    });
  },
);

export const deleteMultipleAdvances = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Advance.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '预支记录批量删除成功',
    });
  },
);
