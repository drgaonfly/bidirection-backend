import { Request, Response } from 'express';
import Anynoumy from '../models/anynoumy';
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

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.crypto_type) {
    query.crypto_type = queryParams.crypto_type;
  }

  if (queryParams.id) {
    query.id = queryParams.id;
  }

  if (queryParams.from_address) {
    query.from_address = queryParams.from_address;
  }

  if (queryParams.to_address) {
    query.to_address = queryParams.to_address;
  }

  if (queryParams.tx_id) {
    query.tx_id = queryParams.tx_id;
  }

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  return query;
};

export const getAnynoumies = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query);

    const anynoumies = await Anynoumy.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)

      .lean()
      .exec();

    const total = await Anynoumy.countDocuments(query).exec();

    res.json({
      success: true,
      data: anynoumies,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getAnynoumyById = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      data: anynoumy,
    });
  },
);

export const addAnynoumy = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Anynoumy, 'id', 6);

  const anynoumy = new Anynoumy({
    ...req.body,
    id: newId,
  });

  const savedAnynoumy = await anynoumy.save();

  res.status(201).json({
    success: true,
    data: savedAnynoumy,
  });
});

export const updateAnynoumy = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      data: anynoumy,
    });
  },
);

export const deleteAnynoumy = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.deleteOne({
      _id: req.params.id,
    });

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      message: '匿名订单已删除',
    });
  },
);

export const deleteMultipleAnynoumies = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Anynoumy.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '匿名订单批量删除成功',
    });
  },
);
