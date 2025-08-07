import { Request, Response } from 'express';
import Rental from '../models/rental';
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

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.crypto_type) {
    query.crypto_type = queryParams.crypto_type;
  }

  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }

  return query;
};

export const getRentals = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query);

  const rentals = await Rental.find(query)
    .populate('botUser')
    .populate('bot')
    .populate('proxy')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .lean()
    .exec();

  const total = await Rental.countDocuments(query).exec();

  res.json({
    success: true,
    data: rentals,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

export const getRentalById = handleAsync(
  async (req: Request, res: Response) => {
    const rental = await Rental.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .lean();

    if (!rental) {
      res.status(404);
      throw new Error('租赁记录未找到');
    }

    res.json({
      success: true,
      data: rental,
    });
  },
);

export const addRental = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Rental, 'id', 6);

  const rental = new Rental({
    ...req.body,
    id: newId,
    status: 'pending',
    createdAt: new Date(),
  });

  const savedRental = await rental.save();

  res.status(201).json({
    success: true,
    data: savedRental,
  });
});

export const updateRental = handleAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!rental) {
    res.status(404);
    throw new Error('租赁记录未找到');
  }

  res.json({
    success: true,
    data: rental,
  });
});

export const deleteRental = handleAsync(async (req: Request, res: Response) => {
  const rental = await Rental.deleteOne({
    _id: req.params.id,
  });

  if (!rental) {
    res.status(404);
    throw new Error('租赁记录未找到');
  }

  res.json({
    success: true,
    message: '租赁记录已删除',
  });
});

export const deleteMultipleRentals = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Rental.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '租赁记录批量删除成功',
    });
  },
);
