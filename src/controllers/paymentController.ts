import { Request, Response } from 'express';
import Payment from '../models/payment';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import { generateOrderNumber } from '../utils/generateOrderNumber';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import User from '../models/user';

const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.orderNumber) {
    query.orderNumber = { $regex: queryParams.orderNumber, $options: 'i' };
  }

  if (queryParams.amount) {
    query.amount = Number(queryParams.amount);
  }

  if (queryParams.paymentAmount) {
    query.paymentAmount = Number(queryParams.paymentAmount);
  }

  if (queryParams.txHash) {
    query.txHash = queryParams.txHash;
  }

  if (queryParams.sendAddress) {
    query.sendAddress = queryParams.sendAddress;
  }

  if (queryParams.receiveAddress) {
    query.receiveAddress = queryParams.receiveAddress;
  }

  if (queryParams.crypto_type) {
    query.crypto_type = queryParams.crypto_type;
  }

  if (queryParams.botUser) {
    query.botUser = queryParams.botUser;
  }

  if (queryParams.bot) {
    query.bot = queryParams.bot;
  }

  if (queryParams.subscription) {
    query.subscription = queryParams.subscription;
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

export const getPayments = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const payments = await Payment.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .lean()
      .exec();

    const total = await Payment.countDocuments(query).exec();

    res.json({
      success: true,
      data: payments,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getPaymentById = handleAsync(
  async (req: Request, res: Response) => {
    const payment = await Payment.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!payment) {
      res.status(404);
      throw new Error('支付记录未找到');
    }

    res.json({
      success: true,
      data: payment,
    });
  },
);

export const addPayment = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Payment, 'id', 6);

  const payment = new Payment({
    ...req.body,
    id: newId,
    orderNumber: await generateOrderNumber(),
    status: 'pending',
    createdAt: new Date(),
    expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
  });

  const savedPayment = await payment.save();

  res.status(201).json({
    success: true,
    data: savedPayment,
  });
});

export const updatePayment = handleAsync(
  async (req: Request, res: Response) => {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!payment) {
      res.status(404);
      throw new Error('支付记录未找到');
    }

    res.json({
      success: true,
      data: payment,
    });
  },
);

export const deletePayment = handleAsync(
  async (req: Request, res: Response) => {
    const payment = await Payment.deleteOne({
      _id: req.params.id,
    });

    if (!payment) {
      res.status(404);
      throw new Error('支付记录未找到');
    }

    res.json({
      success: true,
      message: '支付记录已删除',
    });
  },
);

export const deleteMultiplePayments = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Payment.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '支付记录批量删除成功',
    });
  },
);
