import { Request, Response } from 'express';
import Integer from '../models/integer';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import Bot from '../models/bot';
import BotUser from '../models/botUser';

const buildQuery = async (queryParams: any): Promise<any> => {
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

  if (queryParams.amount) {
    query.amount = Number(queryParams.amount);
  }

  if (queryParams.approach) {
    query.approach = queryParams.approach;
  }

  if (queryParams.id) {
    query.id = queryParams.id;
  }

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  return query;
};

export const getIntegers = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query);

  const integers = await Integer.find(query)
    .populate('botUser')
    .populate('bot')
    .populate('proxy')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)

    .lean()
    .exec();

  const total = await Integer.countDocuments(query).exec();

  res.json({
    success: true,
    data: integers,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

export const getIntegerById = handleAsync(
  async (req: Request, res: Response) => {
    const integer = await Integer.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!integer) {
      res.status(404);
      throw new Error('积分记录未找到');
    }

    res.json({
      success: true,
      data: integer,
    });
  },
);

export const addInteger = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Integer, 'id', 6);

  const integer = new Integer({
    ...req.body,
    id: newId,
  });

  const savedInteger = await integer.save();

  res.status(201).json({
    success: true,
    data: savedInteger,
  });
});

export const updateInteger = handleAsync(
  async (req: Request, res: Response) => {
    const integer = await Integer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!integer) {
      res.status(404);
      throw new Error('积分记录未找到');
    }

    res.json({
      success: true,
      data: integer,
    });
  },
);

export const deleteInteger = handleAsync(
  async (req: Request, res: Response) => {
    const integer = await Integer.deleteOne({
      _id: req.params.id,
    });

    if (!integer) {
      res.status(404);
      throw new Error('积分记录未找到');
    }

    res.json({
      success: true,
      message: '积分记录已删除',
    });
  },
);

export const deleteMultipleIntegers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Integer.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '积分记录批量删除成功',
    });
  },
);
