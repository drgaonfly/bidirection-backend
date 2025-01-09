import { Request, Response } from 'express';
import Customer from '../models/customer';
import handleAsync from '../utils/handleAsync';
import User from '../models/user';
import { isProxy, isEmployee } from '../middlewares/authMiddleware';
import { RequestCustom } from 'user';

// 构建查询条件
const buildQuery = async (
  queryParams: any,
  req: RequestCustom,
): Promise<any> => {
  const query: any = {};

  if (queryParams.phoneNumber) {
    query.phoneNumber = { $regex: queryParams.phoneNumber, $options: 'i' };
  }

  if (queryParams.isOnline !== '') {
    query.isOnline = queryParams.isOnline === 'true';
  }

  if (queryParams.ip) {
    query.ip = { $regex: queryParams.ip, $options: 'i' };
  }

  if (queryParams.password) {
    query.password = { $regex: queryParams.password, $options: 'i' };
  }

  if (queryParams.remark) {
    query.remark = { $regex: queryParams.remark, $options: 'i' };
  }

  if (queryParams.phoneCode) {
    query.phoneCode = { $regex: queryParams.phoneCode, $options: 'i' };
  }

  if (queryParams.user) {
    let searchText;
    try {
      const userParam = JSON.parse(String(queryParams.user));
      searchText = userParam.name;
    } catch (e) {
      searchText = String(queryParams.user).trim();
    }
    const userData = await User.find({
      name: {
        $regex: searchText,
        $options: 'i',
      },
    });

    if (userData && userData.length > 0) {
      query.user = { $in: userData.map((user) => user._id) };
    } else {
      return null;
    }
  }

  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.user = { $in: [...employeeIds, req.user._id] };
  }

  if (isEmployee(req.user)) {
    query.user = req.user._id;
  }

  return query;
};

// 获取客户列表
const getCustomers = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query, req);

  if (query === null) {
    res.json({
      success: true,
      data: [],
      total: 0,
      current: +current,
      pageSize: +pageSize,
    });
    return;
  }

  const customers = await Customer.find(query)
    .populate('user')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Customer.countDocuments(query).exec();

  res.json({
    success: true,
    data: customers.map((customer) => ({
      ...customer.toObject(),
    })),
    total,
    current: +current,
    pageSize: +pageSize,
  });
});
// 创建新客户
const addCustomer = handleAsync(async (req: Request, res: Response) => {
  const customer = await Customer.create({
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: customer,
  });
});

// 获取单个客户
const getCustomerById = handleAsync(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error('客户不存在');
  }

  res.json({
    success: true,
    data: {
      ...customer,
      localStorage: JSON.parse(customer.localStorage),
    },
  });
});

// 更新客户
const updateCustomer = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    res.status(404);
    throw new Error('客户不存在');
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: updatedCustomer,
  });
});

// 删除客户
const deleteCustomer = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const customer = await Customer.findByIdAndDelete(id);

  if (!customer) {
    res.status(404);
    throw new Error('客户不存在');
  }

  res.json({
    success: true,
    data: { message: '客户删除成功' },
  });
});

// 批量删除客户
const deleteMultipleCustomers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Customer.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个客户`,
    });
  },
);

export {
  getCustomers,
  addCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  deleteMultipleCustomers,
};
