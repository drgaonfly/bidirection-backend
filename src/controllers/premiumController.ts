import { Request, Response } from 'express';
import Premium from '../models/premium';
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

  if (queryParams.limit_month) {
    query.limit_month = Number(queryParams.limit_month);
  }

  if (queryParams.expiredAt) {
    query.expiredAt = queryParams.expiredAt;
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

export const getPremiums = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const premiums = await Premium.find(query)
      .sort('-createdAt')
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await Premium.countDocuments(query).exec();

    res.json({
      success: true,
      data: premiums,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getPremiumById = handleAsync(
  async (req: Request, res: Response) => {
    const premium = await Premium.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!premium) {
      res.status(404);
      throw new Error('会员记录未找到');
    }

    res.json({
      success: true,
      data: premium,
    });
  },
);

export const addPremium = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Premium, 'id', 6);

  const premium = new Premium({
    ...req.body,
    id: newId,
  });

  const savedPremium = await premium.save();

  res.status(201).json({
    success: true,
    data: savedPremium,
  });
});

export const updatePremium = handleAsync(
  async (req: Request, res: Response) => {
    const premium = await Premium.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!premium) {
      res.status(404);
      throw new Error('会员记录未找到');
    }

    res.json({
      success: true,
      data: premium,
    });
  },
);

export const deletePremium = handleAsync(
  async (req: Request, res: Response) => {
    const premium = await Premium.deleteOne({
      _id: req.params.id,
    });

    if (!premium) {
      res.status(404);
      throw new Error('会员记录未找到');
    }

    res.json({
      success: true,
      message: '会员记录已删除',
    });
  },
);

export const deleteMultiplePremiums = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Premium.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '会员记录批量删除成功',
    });
  },
);
