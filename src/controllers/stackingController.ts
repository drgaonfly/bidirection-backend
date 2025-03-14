import { Request, Response } from 'express';
import Stacking from '../models/stacking';
import handleAsync from '../utils/handleAsync';
import Customer from '../models/customer';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.fromNetwork) {
    query.fromNetwork = queryParams.fromNetwork;
  }

  if (queryParams.toNetwork) {
    query.toNetwork = queryParams.toNetwork;
  }

  return query;
};

// 获取所有叠加配置记录
const getStackings = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const stackings = await Stacking.find(query)
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Stacking.countDocuments(query).exec();

  res.json({
    success: true,
    data: stackings,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 添加叠加配置记录
const addStacking = handleAsync(async (req: Request, res: Response) => {
  const newStacking = new Stacking({
    ...req.body,
  });

  const savedStacking = await newStacking.save();
  res.json({
    success: true,
    data: savedStacking,
  });
});

// 根据 ID 获取叠加配置记录
const getStackingById = handleAsync(async (req: Request, res: Response) => {
  const stacking = await Stacking.findById(req.params.id);

  res.json({
    success: true,
    data: stacking,
  });
});

// 更新叠加配置记录
const updateStacking = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // 先获取当前记录
  const currentStacking = await Stacking.findById(id);
  if (!currentStacking) {
    res.status(404).json({
      success: false,
      message: '记录不存在',
    });
    return;
  }

  // 如果当前记录已经是冻结状态，不允许改为未冻结
  if (currentStacking.isFrozen && updateData.isFrozen === false) {
    res.status(400).json({
      success: false,
      message: '已确认的记录不能改为冻结状态',
    });
    return;
  }

  // 如果要将状态改为冻结，需要更新用户的质押金额
  if (!currentStacking.isFrozen && updateData.isFrozen === true) {
    // 查找并更新转出方的质押金额
    const fromCustomer = await Customer.findOneAndUpdate(
      {
        address: currentStacking.fromAddress,
        network: currentStacking.fromNetwork,
      },
      { $inc: { usdtStaking: currentStacking.amount } },
      { new: true },
    );

    if (!fromCustomer) {
      res.status(404).json({
        success: false,
        message: '转出方用户不存在',
      });
      return;
    }
  }

  const updatedStacking = await Stacking.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: updatedStacking,
    message: updateData.isFrozen ? '更新成功并已确认金额' : '更新成功',
  });
});

// 删除叠加配置记录
const deleteStacking = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const stacking = await Stacking.findByIdAndDelete(id);

  res.json({
    success: true,
    message: stacking,
  });
});

// 批量删除叠加配置记录
const deleteMultipleStackings = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Stacking.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} stackings deleted successfully`,
    });
  },
);

// 处理质押转账
const handleStackingTransfer = handleAsync(
  async (req: Request, res: Response) => {
    const {
      fromAddress, // 转出方地址
      fromNetwork, // 转出方网络
      toAddress, // 转入方地址
      toNetwork, // 转入方网络
      amount, // 转账金额
      isFrozen = false, // 是否冻结质押金额，默认false
    } = req.body;

    // 记录质押转账记录
    const stackingTransfer = await Stacking.create({
      fromAddress,
      fromNetwork,
      toAddress,
      toNetwork,
      amount,
      isFrozen,
      createdAt: new Date(),
    });

    let fromCustomer = null;

    // 只有当 isFrozen 为 true 时才更新质押金额
    if (isFrozen) {
      // 查找并更新转出方的质押金额
      fromCustomer = await Customer.findOneAndUpdate(
        { address: fromAddress, network: fromNetwork },
        { $inc: { usdtStaking: amount } },
        { new: true },
      );

      if (!fromCustomer) {
        res.status(404).json({
          success: false,
          message: '转出方用户不存在',
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        transfer: stackingTransfer,
        updatedCustomer: fromCustomer,
      },
      message: isFrozen ? '质押转账成功并已冻结金额' : '质押转账成功',
    });
  },
);

// 获取指定地址的冻结金额
const getUnfrozenStackings = handleAsync(
  async (req: Request, res: Response) => {
    const { address, network } = req.query;

    if (!address || !network) {
      res.status(400).json({
        success: false,
        message: '请提供地址和网络参数',
      });
      return;
    }

    const stackings = await Stacking.find({
      fromAddress: address,
      fromNetwork: network,
      isFrozen: false,
    }).sort('-createdAt');

    // 使用更精确的方式计算总和
    const totalAmount = stackings.reduce((sum, record) => {
      // 将数字转换为字符串，然后使用 parseFloat 处理
      const amount = parseFloat(record.amount.toString());
      return sum + amount;
    }, 0);

    // 保留4位小数
    const formattedTotalAmount = Number(totalAmount.toFixed(6));

    res.json({
      success: true,
      data: {
        records: stackings,
        totalAmount: formattedTotalAmount,
      },
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleStackings,
  updateStacking,
  deleteStacking,
  getStackings,
  addStacking,
  getStackingById,
  handleStackingTransfer,
  getUnfrozenStackings,
};
