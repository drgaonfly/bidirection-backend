import { Request, Response, NextFunction } from 'express';
import Deduction from '../models/deduction';
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

  if (queryParams.currency) {
    query.currency = queryParams.currency;
  }

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.reason) {
    query.reason = { $regex: queryParams.reason, $options: 'i' };
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

export const getDeductions = handleAsync(
  async (
    req: RequestCustom,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const deductions = await Deduction.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await Deduction.countDocuments(query).exec();

    res.json({
      success: true,
      data: deductions,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getDeductionById = handleAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    const deduction = await Deduction.findById(id)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .lean()
      .exec();

    if (!deduction) {
      res.status(404).json({
        success: false,
        message: '扣款记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: deduction,
    });
  },
);

export const addDeduction = handleAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const deductionData = req.body;

    // 生成唯一ID
    deductionData.id = await IdGen.next(Deduction, 'id');

    const deduction = new Deduction(deductionData);
    await deduction.save();

    res.status(201).json({
      success: true,
      message: '扣款记录创建成功',
      data: deduction,
    });
  },
);

export const updateDeduction = handleAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    const deduction = await Deduction.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .exec();

    if (!deduction) {
      res.status(404).json({
        success: false,
        message: '扣款记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '扣款记录更新成功',
      data: deduction,
    });
  },
);

export const deleteDeduction = handleAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    const deduction = await Deduction.findByIdAndDelete(id).exec();

    if (!deduction) {
      res.status(404).json({
        success: false,
        message: '扣款记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '扣款记录删除成功',
    });
  },
);

export const deleteMultipleDeductions = handleAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供要删除的扣款记录ID数组',
      });
      return;
    }

    const result = await Deduction.deleteMany({ _id: { $in: ids } }).exec();

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条扣款记录`,
      deletedCount: result.deletedCount,
    });
  },
);
