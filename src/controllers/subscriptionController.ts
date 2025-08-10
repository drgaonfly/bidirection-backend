import { Request, Response } from 'express';
import Subscription from '../models/subscription';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import { RequestCustom } from '../types/user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import User from '../models/user';

// 构建查询参数
const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  // status
  if (queryParams.status) {
    query.status = queryParams.status;
  }

  // plan
  if (queryParams.plan) {
    query.plan = queryParams.plan;
  }

  // isAuto
  if (queryParams.isAuto !== undefined) {
    query.isAuto = queryParams.isAuto;
  }

  // isTrial
  if (queryParams.isTrial !== undefined) {
    query.isTrial = queryParams.isTrial;
  }

  // 代理查询逻辑
  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.proxy = { $in: [req.user._id, ...employeeIds] };
  } else if (isEmployee(req.user)) {
    query.proxy = req.user.proxy;
  }

  return query;
};

// 获取所有订阅
const getSubscriptions = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const subscriptions = await Subscription.find(query)
      .populate('botUser')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .exec();

    const total = await Subscription.countDocuments(query).exec();

    res.json({
      success: true,
      data: subscriptions,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 获取订阅详情
const getSubscriptionById = handleAsync(async (req: Request, res: Response) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate('botUser')
    .exec();

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  res.json({
    success: true,
    data: subscription,
  });
});

// 添加新订阅
const addSubscription = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Subscription, 'id', 6);

  const newSubscription = new Subscription({
    ...req.body,
    id: newId,
    createdAt: new Date(),
  });

  const savedSubscription = await newSubscription.save();

  res.json({
    success: true,
    data: savedSubscription,
  });
});

// 更新订阅
const updateSubscription = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedSubscription = await Subscription.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  ).exec();

  if (!updatedSubscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  res.json({
    success: true,
    data: updatedSubscription,
  });
});

// 删除订阅
const deleteSubscription = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const subscription = await Subscription.findByIdAndDelete(id).exec();

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  res.json({
    success: true,
    data: { message: 'Subscription deleted successfully' },
  });
});

// 批量删除订阅
const deleteMultipleSubscriptions = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Subscription.deleteMany({
      _id: { $in: ids },
    }).exec();

    res.json({
      success: true,
      message: `${ids.length} subscriptions deleted successfully`,
    });
  },
);

export {
  getSubscriptions,
  getSubscriptionById,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  deleteMultipleSubscriptions,
};
