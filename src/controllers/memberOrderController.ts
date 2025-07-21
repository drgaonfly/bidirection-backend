import { Request, Response } from 'express';
import MemberOrder from '../models/memberOrder';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';
import BotUser from '../models/botUser';

const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.orderNumber) {
    query.orderNumber = { $regex: queryParams.orderNumber, $options: 'i' };
  }

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

  return query;
};

export const getMemberOrders = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query);

    const memberOrders = await MemberOrder.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .populate('botUser')
      .populate('bot')
      .lean()
      .exec();

    const total = await MemberOrder.countDocuments(query).exec();

    res.json({
      success: true,
      data: memberOrders,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getMemberOrderById = handleAsync(
  async (req: Request, res: Response) => {
    const memberOrder = await MemberOrder.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!memberOrder) {
      res.status(404);
      throw new Error('会员订单未找到');
    }

    res.json({
      success: true,
      data: memberOrder,
    });
  },
);

export const createMemberOrder = handleAsync(
  async (req: Request, res: Response) => {
    const memberOrder = new MemberOrder({
      ...req.body,
      createdAt: new Date(),
    });

    const savedMemberOrder = await memberOrder.save();

    res.status(201).json({
      success: true,
      data: savedMemberOrder,
    });
  },
);

export const updateMemberOrder = handleAsync(
  async (req: Request, res: Response) => {
    const memberOrder = await MemberOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!memberOrder) {
      res.status(404);
      throw new Error('会员订单未找到');
    }

    res.json({
      success: true,
      data: memberOrder,
    });
  },
);

export const deleteMemberOrder = handleAsync(
  async (req: Request, res: Response) => {
    const memberOrder = await MemberOrder.deleteOne({
      _id: req.params.id,
    });

    if (!memberOrder) {
      res.status(404);
      throw new Error('会员订单未找到');
    }

    res.json({
      success: true,
      message: '会员订单已删除',
    });
  },
);

export const deleteMultipleMemberOrders = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await MemberOrder.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '会员订单批量删除成功',
    });
  },
);
