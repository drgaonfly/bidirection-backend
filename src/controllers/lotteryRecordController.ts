import { Request, Response } from 'express';
import LotteryRecord from '../models/lotteryRecord';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.wallet) {
    query.wallet = queryParams.wallet;
  }

  if (queryParams.usdt) {
    query.usdt = +queryParams.usdt;
  }

  return query;
};

// 获取所有抽奖记录
const getLotteryRecords = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const lotteryRecords = await LotteryRecord.find(query)
    .populate({
      path: 'wallet',
      populate: { path: 'user' }, // 只返回 user 的 name
    })
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await LotteryRecord.countDocuments(query).exec();

  res.json({
    success: true,
    data: lotteryRecords,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 添加抽奖记录
const addLotteryRecord = handleAsync(async (req: Request, res: Response) => {
  const newLotteryRecord = new LotteryRecord({
    ...req.body,
  });

  const savedLotteryRecord = await newLotteryRecord.save();
  res.json({
    success: true,
    data: savedLotteryRecord,
  });
});

// 根据 ID 获取抽奖记录
const getLotteryRecordById = handleAsync(
  async (req: Request, res: Response) => {
    const lotteryRecord = await LotteryRecord.findById(req.params.id).populate(
      'wallet',
    );

    res.json({
      success: true,
      data: lotteryRecord,
    });
  },
);

// 更新抽奖记录
const updateLotteryRecord = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedLotteryRecord = await LotteryRecord.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedLotteryRecord,
  });
});

// 删除抽奖记录
const deleteLotteryRecord = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const lotteryRecord = await LotteryRecord.findByIdAndDelete(id);

  res.json({
    success: true,
    message: lotteryRecord,
  });
});

// 批量删除抽奖记录
const deleteMultipleLotteryRecords = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await LotteryRecord.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} lottery records deleted successfully`,
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleLotteryRecords,
  updateLotteryRecord,
  deleteLotteryRecord,
  getLotteryRecords,
  addLotteryRecord,
  getLotteryRecordById,
};
