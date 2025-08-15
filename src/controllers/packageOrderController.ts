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
const buildQuery = (queryParams: any): any => {
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

  return query;
};

// 获取所有套餐订单
export const getPackageOrders = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = buildQuery(req.query);

    // 权限检查：代理只能看到自己及其员工的订单
    if (isProxy(req.user)) {
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);
      query.proxy = { $in: [...employeeIds, req.user._id] };
    }

    if (isEmployee(req.user)) {
      query.proxy = req.user._id;
    }

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

    // 权限检查：代理只能看到自己及其员工的订单
    if (isProxy(req.user) || isEmployee(req.user)) {
      if (
        packageOrder.proxy &&
        packageOrder.proxy.toString() !== req.user._id.toString()
      ) {
        const employees = await User.find({ proxy: req.user._id });
        const employeeIds = employees.map((employee) =>
          employee._id.toString(),
        );
        if (!employeeIds.includes(packageOrder.proxy.toString())) {
          res.status(403);
          throw new Error('没有权限查看此订单');
        }
      }
    }

    res.json({
      success: true,
      data: packageOrder,
    });
  },
);

// 创建套餐订单
export const createPackageOrder = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const newId = await IdGen.next(PackageOrder, 'id', 6);
    const orderNumber = await generateOrderNumber();

    // 验证套餐是否存在
    const packageData = await Package.findById(req.body.package);
    if (!packageData) {
      res.status(400);
      throw new Error('套餐不存在');
    }

    // 验证机器人是否存在
    const bot = await Bot.findById(req.body.bot);
    if (!bot) {
      res.status(400);
      throw new Error('机器人不存在');
    }

    // 验证机器人用户是否存在
    const botUser = await BotUser.findById(req.body.botUser);
    if (!botUser) {
      res.status(400);
      throw new Error('机器人用户不存在');
    }

    // 计算过期时间
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + (req.body.validityDays || 3));

    const packageOrder = new PackageOrder({
      ...req.body,
      id: newId,
      orderNumber,
      expiredAt,
      packageName: packageData.name,
      times: packageData.times,
      energy: packageData.aqusition,
      minConsumption: packageData.min_expenditure,
    });

    const savedPackageOrder = await packageOrder.save();

    res.status(201).json({
      success: true,
      data: savedPackageOrder,
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

    // 权限检查：代理只能更新自己及其员工的订单
    if (isProxy(req.user) || isEmployee(req.user)) {
      if (
        packageOrder.proxy &&
        packageOrder.proxy.toString() !== req.user._id.toString()
      ) {
        const employees = await User.find({ proxy: req.user._id });
        const employeeIds = employees.map((employee) =>
          employee._id.toString(),
        );
        if (!employeeIds.includes(packageOrder.proxy.toString())) {
          res.status(403);
          throw new Error('没有权限更新此订单');
        }
      }
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

    // 权限检查：代理只能删除自己及其员工的订单
    if (isProxy(req.user) || isEmployee(req.user)) {
      if (
        packageOrder.proxy &&
        packageOrder.proxy.toString() !== req.user._id.toString()
      ) {
        const employees = await User.find({ proxy: req.user._id });
        const employeeIds = employees.map((employee) =>
          employee._id.toString(),
        );
        if (!employeeIds.includes(packageOrder.proxy.toString())) {
          res.status(403);
          throw new Error('没有权限删除此订单');
        }
      }
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

    // 权限检查：代理只能删除自己及其员工的订单
    if (isProxy(req.user) || isEmployee(req.user)) {
      const employees = await User.find({ proxy: req.user._id });
      const employeeIds = employees.map((employee) => employee._id);

      const orders = await PackageOrder.find({ _id: { $in: ids } });
      const unauthorizedOrders = orders.filter(
        (order) =>
          order.proxy &&
          !employeeIds.includes(order.proxy) &&
          order.proxy.toString() !== req.user._id.toString(),
      );

      if (unauthorizedOrders.length > 0) {
        res.status(403);
        throw new Error('存在没有权限删除的订单');
      }
    }

    const result = await PackageOrder.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 个套餐订单`,
      deletedCount: result.deletedCount,
    });
  },
);
