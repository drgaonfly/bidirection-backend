import { Request, Response } from 'express';
import Advance from '../models/advance';
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

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.amount) {
    query.amount = Number(queryParams.amount);
  }

  if (queryParams.expiredAt) {
    query.expiredAt = queryParams.expiredAt;
  }

  // 代理查询逻辑 - 根据用户角色设置查询条件
  if (isProxy(req.user)) {
    // 代理用户：可以查看自己及其下属员工的预支记录
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.proxy = { $in: [...employeeIds, req.user._id] };
  } else if (isEmployee(req.user)) {
    // 员工用户：只能查看自己的预支记录
    query.proxy = req.user._id;
  } else {
    // 管理员或其他角色：可以查看所有记录（不添加 proxy 限制）
    // 如果明确指定了 proxy 参数，则使用指定的值
    if (queryParams.proxy) {
      query.proxy = queryParams.proxy;
    }
  }

  return query;
};

export const getAdvances = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const advances = await Advance.find(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)

      .lean()
      .exec();

    const total = await Advance.countDocuments(query).exec();

    res.json({
      success: true,
      data: advances,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getAdvanceById = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const query: any = { _id: req.params.id };

    // 添加代理查询逻辑
    if (isProxy(req.user)) {
      // 代理用户：可以查看自己及其下属员工的预支记录
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);
      query.proxy = { $in: [...employeeIds, req.user._id] };
    } else if (isEmployee(req.user)) {
      // 员工用户：只能查看自己的预支记录
      query.proxy = req.user._id;
    }
    // 管理员或其他角色：可以查看所有记录（不添加 proxy 限制）

    const advance = await Advance.findOne(query)
      .populate('botUser')
      .populate('bot')
      .populate('proxy')
      .lean();

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      data: advance,
    });
  },
);

export const addAdvance = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const newId = await IdGen.next(Advance, 'id', 6);

    // 自动设置代理字段
    const advanceData = {
      ...req.body,
      id: newId,
      proxy: req.user._id, // 自动设置为当前用户
    };

    const advance = new Advance(advanceData);

    const savedAdvance = await advance.save();

    res.status(201).json({
      success: true,
      data: savedAdvance,
    });
  },
);

export const updateAdvance = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const query: any = { _id: req.params.id };

    // 添加代理查询逻辑
    if (isProxy(req.user)) {
      // 代理用户：可以更新自己及其下属员工的预支记录
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);
      query.proxy = { $in: [...employeeIds, req.user._id] };
    } else if (isEmployee(req.user)) {
      // 员工用户：只能更新自己的预支记录
      query.proxy = req.user._id;
    }
    // 管理员或其他角色：可以更新所有记录（不添加 proxy 限制）

    const advance = await Advance.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      data: advance,
    });
  },
);

export const deleteAdvance = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const query: any = { _id: req.params.id };

    // 添加代理查询逻辑
    if (isProxy(req.user)) {
      // 代理用户：可以删除自己及其下属员工的预支记录
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);
      query.proxy = { $in: [...employeeIds, req.user._id] };
    } else if (isEmployee(req.user)) {
      // 员工用户：只能删除自己的预支记录
      query.proxy = req.user._id;
    }
    // 管理员或其他角色：可以删除所有记录（不添加 proxy 限制）

    const advance = await Advance.findOneAndDelete(query);

    if (!advance) {
      res.status(404);
      throw new Error('预支记录未找到');
    }

    res.json({
      success: true,
      message: '预支记录已删除',
    });
  },
);

export const deleteMultipleAdvances = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { ids } = req.body;
    const query: any = { _id: { $in: ids } };

    // 添加代理查询逻辑
    if (isProxy(req.user)) {
      // 代理用户：可以删除自己及其下属员工的预支记录
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);
      query.proxy = { $in: [...employeeIds, req.user._id] };
    } else if (isEmployee(req.user)) {
      // 员工用户：只能删除自己的预支记录
      query.proxy = req.user._id;
    }
    // 管理员或其他角色：可以删除所有记录（不添加 proxy 限制）

    const result = await Advance.deleteMany(query);

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条预支记录`,
    });
  },
);
