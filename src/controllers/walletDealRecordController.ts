import { Request, Response } from 'express';
import WalletDealRecord from '../models/walletDealRecord';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.wallet) {
    query.wallet = queryParams.wallet;
  }

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.isOperativeOnAdmin !== undefined) {
    query.isOperativeOnAdmin = queryParams.isOperativeOnAdmin === 'true';
  }

  return query;
};

// 获取所有钱包交易记录
const getWalletDealRecords = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = buildQuery(req.query);

    const walletDealRecords = await WalletDealRecord.find(query)
      .populate({
        path: 'wallet',
        populate: { path: 'user' }, // 只返回 user 的 name
      })
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .exec();

    const total = await WalletDealRecord.countDocuments(query).exec();

    res.json({
      success: true,
      data: walletDealRecords,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 添加钱包交易记录
const addWalletDealRecord = handleAsync(async (req: Request, res: Response) => {
  const newWalletDealRecord = new WalletDealRecord({
    ...req.body,
  });

  const savedWalletDealRecord = await newWalletDealRecord.save();
  res.json({
    success: true,
    data: savedWalletDealRecord,
  });
});

// 根据 ID 获取钱包交易记录
const getWalletDealRecordById = handleAsync(
  async (req: Request, res: Response) => {
    const walletDealRecord = await WalletDealRecord.findById(
      req.params.id,
    ).populate('wallet');

    res.json({
      success: true,
      data: walletDealRecord,
    });
  },
);

// 更新钱包交易记录
const updateWalletDealRecord = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const updatedWalletDealRecord = await WalletDealRecord.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: updatedWalletDealRecord,
    });
  },
);

// 删除钱包交易记录
const deleteWalletDealRecord = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const walletDealRecord = await WalletDealRecord.findByIdAndDelete(id);

    res.json({
      success: true,
      message: walletDealRecord,
    });
  },
);

// 批量删除钱包交易记录
const deleteMultipleWalletDealRecords = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await WalletDealRecord.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} wallet deal records deleted successfully`,
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleWalletDealRecords,
  updateWalletDealRecord,
  deleteWalletDealRecord,
  getWalletDealRecords,
  addWalletDealRecord,
  getWalletDealRecordById,
};
