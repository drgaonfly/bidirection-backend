import { Request, Response } from 'express';
import Package from '../models/package';
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import { getAdminUser } from '../utils/getAdminUser';

// 构建查询参数
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.id) {
    query.id = queryParams.id;
  }
  if (queryParams.expenditure) {
    query.expenditure = queryParams.expenditure;
  }
  if (queryParams.aqusition) {
    query.aqusition = queryParams.aqusition;
  }
  if (queryParams.expiration) {
    query.expiration = queryParams.expiration;
  }
  if (queryParams.commission) {
    query.commission = queryParams.commission;
  }
  if (queryParams.times) {
    query.times = queryParams.times;
  }
  if (queryParams.type) {
    query.type = queryParams.type;
  }

  return query;
};

// 获取所有套餐
export const getPackages = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const packages = await Package.find(query)
    .sort('-id')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .lean()
    .exec();

  const total = await Package.countDocuments(query).exec();

  res.json({
    success: true,
    data: packages,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 获取单个套餐
export const getPackageById = handleAsync(
  async (req: Request, res: Response) => {
    const pkg = await Package.findOne({
      _id: req.params.id,
    }).lean();

    if (!pkg) {
      res.status(404);
      throw new Error('套餐未找到');
    }

    res.json({
      success: true,
      data: pkg,
    });
  },
);

// 新增套餐
export const addPackage = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Package, 'id', 6);

  if (req.body.commission > req.body.expenditure) {
    res.status(400);
    throw new Error('抽佣不能大于用户花费');
  }

  const admin = await getAdminUser();

  const pkg = new Package({
    ...req.body,
    id: newId,
    aqusition: req.body.times * (admin.energy_per_times || 65000),
  });

  const savedPackage = await pkg.save();

  res.status(201).json({
    success: true,
    data: savedPackage,
  });
});

// 更新套餐
export const updatePackage = handleAsync(
  async (req: Request, res: Response) => {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!pkg) {
      res.status(404);
      throw new Error('套餐未找到');
    }

    res.json({
      success: true,
      data: pkg,
    });
  },
);

// 删除套餐
export const deletePackage = handleAsync(
  async (req: Request, res: Response) => {
    const pkg = await Package.deleteOne({
      _id: req.params.id,
    });

    if (!pkg) {
      res.status(404);
      throw new Error('套餐未找到');
    }

    res.json({
      success: true,
      message: '套餐已删除',
    });
  },
);

// 批量删除套餐
export const deleteMultiplePackages = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Package.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '套餐批量删除成功',
    });
  },
);
