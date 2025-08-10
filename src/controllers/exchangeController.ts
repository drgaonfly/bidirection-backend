import { Request, Response } from 'express';
import Exchange from '../models/exchange';
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

  // hash
  if (queryParams.hash) {
    query.hash = queryParams.hash;
  }

  // txid
  if (queryParams.txid) {
    query.txid = queryParams.txid;
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

export const getExchanges = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const exchanges = await Exchange.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await Exchange.countDocuments(query).exec();

    res.json({
      success: true,
      data: exchanges,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getExchangeById = handleAsync(
  async (req: Request, res: Response) => {
    const exchange = await Exchange.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!exchange) {
      res.status(404);
      throw new Error('交易记录未找到');
    }

    res.json({
      success: true,
      data: exchange,
    });
  },
);

export const addExchange = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Exchange, 'id', 6);

  const exchange = new Exchange({
    ...req.body,
    id: newId,
    status: 'pending',
    createdAt: new Date(),
  });

  const savedExchange = await exchange.save();

  res.status(201).json({
    success: true,
    data: savedExchange,
  });
});

export const updateExchange = handleAsync(
  async (req: Request, res: Response) => {
    const exchange = await Exchange.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!exchange) {
      res.status(404);
      throw new Error('交易记录未找到');
    }

    res.json({
      success: true,
      data: exchange,
    });
  },
);

export const deleteExchange = handleAsync(
  async (req: Request, res: Response) => {
    const exchange = await Exchange.deleteOne({
      _id: req.params.id,
    });

    if (!exchange) {
      res.status(404);
      throw new Error('交易记录未找到');
    }

    res.json({
      success: true,
      message: '交易记录已删除',
    });
  },
);

export const deleteMultipleExchanges = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Exchange.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '交易记录批量删除成功',
    });
  },
);
