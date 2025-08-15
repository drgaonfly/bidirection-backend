import { Response } from 'express';
import PackageOrder from '../models/packageOrder';
import Package from '../models/package';
import Bot from '../models/bot';
import BotUser from '../models/botUser';
import User from '../models/user';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import { generateOrderNumber } from '../utils/generateOrderNumber';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import { RequestCustom } from '../types/user';

// 构建查询参数
const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  if (queryParams.id) {
    query.id = queryParams.id;
  }
  if (queryParams.bot) {
    query.bot = queryParams.bot;
  }
  if (queryParams.botUser) {
    query.botUser = queryParams.botUser;
  }
  if (queryParams.package) {
    query.package = queryParams.package;
  }
  if (queryParams.status) {
    query.status = queryParams.status;
  }
  if (queryParams.paymentType) {
    query.paymentType = queryParams.paymentType;
  }
  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }
  if (queryParams.orderNumber) {
    query.orderNumber = queryParams.orderNumber;
  }

  // 权限检查：代理只能看到自己及其员工的订单
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

// 获取所有套餐订单
export const getPackageOrders = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const packageOrders = await PackageOrder.find(query)
      .populate('bot')
      .populate('botUser')
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await PackageOrder.countDocuments(query).exec();

    res.json({
      success: true,
      data: packageOrders,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 获取单个套餐订单
export const getPackageOrderById = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const packageOrder = await PackageOrder.findById(req.params.id)
      .populate('bot')
      .populate('botUser')
      .populate('proxy')
      .lean();

    if (!packageOrder) {
      res.status(404);
      throw new Error('套餐订单未找到');
    }

    res.json({
      success: true,
      data: packageOrder,
    });
  },
);

// 更新套餐订单
export const updatePackageOrder = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const packageOrder = await PackageOrder.findById(req.params.id)
      .populate('bot')
      .populate('botUser')
      .populate('proxy');

    if (!packageOrder) {
      res.status(404);
      throw new Error('套餐订单未找到');
    }

    const updatedPackageOrder = await PackageOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    )
      .populate('bot')
      .populate('botUser')
      .populate('proxy');

    res.json({
      success: true,
      data: updatedPackageOrder,
    });
  },
);

// 删除套餐订单
export const deletePackageOrder = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const packageOrder = await PackageOrder.findById(req.params.id);

    if (!packageOrder) {
      res.status(404);
      throw new Error('套餐订单未找到');
    }

    await PackageOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '套餐订单删除成功',
    });
  },
);

// 批量删除套餐订单
export const deleteMultiplePackageOrders = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('请提供要删除的订单ID列表');
    }

    const result = await PackageOrder.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 个套餐订单`,
      deletedCount: result.deletedCount,
    });
  },
);
