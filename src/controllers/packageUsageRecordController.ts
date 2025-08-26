import { Response } from 'express';
import PackageUsageRecord from '../models/packageUsageRecord';
import handleAsync from '../utils/handleAsync';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import { RequestCustom } from '../types/user';
import PackageOrder from '../models/packageOrder';
import User from '../models/user';

// 构建查询参数
const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  if (queryParams.id) {
    query.id = queryParams.id;
  }
  if (queryParams.packageOrder) {
    query.packageOrder = queryParams.packageOrder;
  }
  if (queryParams.bot) {
    query.bot = queryParams.bot;
  }
  if (queryParams.botUser) {
    query.botUser = queryParams.botUser;
  }
  if (queryParams.proxy) {
    query.proxy = queryParams.proxy;
  }
  if (queryParams.address) {
    query.address = { $regex: queryParams.address, $options: 'i' };
  }
  if (queryParams.status) {
    query.status = queryParams.status;
  }
  if (queryParams.packageOrder) {
    const ordertData = await PackageOrder.find({
      id: queryParams.packageOrder,
    });

    if (ordertData && ordertData.length > 0) {
      query.packageOrder = { $in: ordertData.map((o) => o._id) };
    } else {
      query.packageOrder = null;
    }
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

// 获取所有使用记录
export const getPackageUsageRecords = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const usageRecords = await PackageUsageRecord.find(query)
      .populate('bot')
      .populate('botUser')
      .populate('proxy')
      .populate('packageOrder')
      .sort('-usedAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await PackageUsageRecord.countDocuments(query).exec();

    res.json({
      success: true,
      data: usageRecords,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 获取单个使用记录
export const getPackageUsageRecordById = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const usageRecord = await PackageUsageRecord.findById(req.params.id)
      .populate('bot')
      .populate('botUser')
      .populate('proxy')
      .populate('packageOrder')
      .lean();

    if (!usageRecord) {
      res.status(404);
      throw new Error('使用记录未找到');
    }

    res.json({
      success: true,
      data: usageRecord,
    });
  },
);

// 删除使用记录
export const deletePackageUsageRecord = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const usageRecord = await PackageUsageRecord.findById(req.params.id);

    if (!usageRecord) {
      res.status(404);
      throw new Error('使用记录未找到');
    }

    await PackageUsageRecord.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '使用记录删除成功',
    });
  },
);

// 批量删除使用记录
export const deleteMultiplePackageUsageRecords = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('请提供要删除的使用记录ID列表');
    }

    const result = await PackageUsageRecord.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条使用记录`,
      deletedCount: result.deletedCount,
    });
  },
);

export const updatePackageUsageRecord = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const usageRecord = await PackageUsageRecord.findById(req.params.id)
      .populate('bot')
      .populate('botUser')
      .populate('proxy');

    if (!usageRecord) {
      res.status(404);
      throw new Error('使用记录未找到');
    }

    const updatedUsageRecord = await PackageUsageRecord.findByIdAndUpdate(
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
      data: updatedUsageRecord,
    });
  },
);
