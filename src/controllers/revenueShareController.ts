import { Request, Response } from 'express';
import RevenueShare from '../models/revenueShare';
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

  if (queryParams.amount) {
    query.amount = Number(queryParams.amount);
  }

  if (queryParams.id) {
    query.id = queryParams.id;
  }

  return query;
};

export const getRevenueShares = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query);

    const revenueShares = await RevenueShare.find(query)
      .populate('revenue_shareable')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await RevenueShare.countDocuments(query).exec();

    res.json({
      success: true,
      data: revenueShares,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getRevenueShareById = handleAsync(
  async (req: Request, res: Response) => {
    const revenueShare = await RevenueShare.findOne({
      _id: req.params.id,
    })
      .populate('revenue_shareable')
      .populate('bot')
      .lean();

    if (!revenueShare) {
      res.status(404);
      throw new Error('分润记录未找到');
    }

    res.json({
      success: true,
      data: revenueShare,
    });
  },
);

export const addRevenueShare = handleAsync(
  async (req: Request, res: Response) => {
    const newId = await IdGen.next(RevenueShare, 'id', 6);

    const revenueShare = new RevenueShare({
      ...req.body,
      id: newId,
    });

    const savedRevenueShare = await revenueShare.save();

    res.status(201).json({
      success: true,
      data: savedRevenueShare,
    });
  },
);

export const updateRevenueShare = handleAsync(
  async (req: Request, res: Response) => {
    const revenueShare = await RevenueShare.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!revenueShare) {
      res.status(404);
      throw new Error('分润记录未找到');
    }

    res.json({
      success: true,
      data: revenueShare,
    });
  },
);

export const deleteRevenueShare = handleAsync(
  async (req: Request, res: Response) => {
    const revenueShare = await RevenueShare.deleteOne({
      _id: req.params.id,
    });

    if (!revenueShare) {
      res.status(404);
      throw new Error('分润记录未找到');
    }

    res.json({
      success: true,
      message: '分润记录已删除',
    });
  },
);

export const deleteMultipleRevenueShares = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await RevenueShare.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '分润记录批量删除成功',
    });
  },
);
