import { Request, Response } from 'express';
import RentalSweep from '../models/rentalSweep';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import Bot from '../models/bot';
import { RequestCustom } from '../types/user';

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

  return query;
};

export const getRentalSweeps = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query);

    const rentalSweeps = await RentalSweep.find(query)
      .populate('bot')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await RentalSweep.countDocuments(query).exec();

    res.json({
      success: true,
      data: rentalSweeps,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getRentalSweepById = handleAsync(
  async (req: Request, res: Response) => {
    const rentalSweep = await RentalSweep.findOne({
      _id: req.params.id,
    })
      .populate('bot')
      .lean();

    if (!rentalSweep) {
      res.status(404);
      throw new Error('闪租清算记录未找到');
    }

    res.json({
      success: true,
      data: rentalSweep,
    });
  },
);

export const addRentalSweep = handleAsync(
  async (req: Request, res: Response) => {
    const newId = await IdGen.next(RentalSweep, 'id', 6);

    const rentalSweep = new RentalSweep({
      ...req.body,
      id: newId,
    });

    const savedRentalSweep = await rentalSweep.save();

    res.status(201).json({
      success: true,
      data: savedRentalSweep,
    });
  },
);

export const updateRentalSweep = handleAsync(
  async (req: Request, res: Response) => {
    const rentalSweep = await RentalSweep.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!rentalSweep) {
      res.status(404);
      throw new Error('闪租清算记录未找到');
    }

    res.json({
      success: true,
      data: rentalSweep,
    });
  },
);

export const deleteRentalSweep = handleAsync(
  async (req: Request, res: Response) => {
    const rentalSweep = await RentalSweep.deleteOne({
      _id: req.params.id,
    });

    if (!rentalSweep) {
      res.status(404);
      throw new Error('闪租清算记录未找到');
    }

    res.json({
      success: true,
      message: '闪租清算记录已删除',
    });
  },
);

export const deleteMultipleRentalSweeps = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await RentalSweep.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '闪租清算记录批量删除成功',
    });
  },
);
