import { Request, Response } from 'express';
import Anynoumy from '../models/anynoumy';
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

  // type
  if (queryParams.type) {
    query.type = queryParams.type;
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

// 获取所有匿名用户
export const getAnynoumies = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query, req);

    const anynoumies = await Anynoumy.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .exec();

    const total = await Anynoumy.countDocuments(query).exec();

    res.json({
      success: true,
      data: anynoumies,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getAnynoumyById = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.findOne({
      _id: req.params.id,
    })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      data: anynoumy,
    });
  },
);

export const addAnynoumy = handleAsync(async (req: Request, res: Response) => {
  const newId = await IdGen.next(Anynoumy, 'id', 6);

  const anynoumy = new Anynoumy({
    ...req.body,
    id: newId,
  });

  const savedAnynoumy = await anynoumy.save();

  res.status(201).json({
    success: true,
    data: savedAnynoumy,
  });
});

export const updateAnynoumy = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      data: anynoumy,
    });
  },
);

export const deleteAnynoumy = handleAsync(
  async (req: Request, res: Response) => {
    const anynoumy = await Anynoumy.deleteOne({
      _id: req.params.id,
    });

    if (!anynoumy) {
      res.status(404);
      throw new Error('匿名订单未找到');
    }

    res.json({
      success: true,
      message: '匿名订单已删除',
    });
  },
);

export const deleteMultipleAnynoumies = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Anynoumy.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '匿名订单批量删除成功',
    });
  },
);
