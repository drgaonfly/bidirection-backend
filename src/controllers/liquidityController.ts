import { Request, Response } from 'express';
import LiquidityBenefits from '../models/liquidity';
import handleAsync from '../utils/handleAsync';
import mongoose from 'mongoose';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.usdtNumber) {
    query.usdtNumber = queryParams.usdtNumber;
  }

  if (queryParams.ethNumber) {
    query.ethNumber = queryParams.ethNumber;
  }

  if (queryParams.bscNumber) {
    query.bscNumber = queryParams.bscNumber;
  }

  return query;
};

// 获取所有流动性收益记录
const getLiquidityBenefits = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = buildQuery(req.query);

    const liquidityBenefits = await LiquidityBenefits.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .exec();

    const total = await LiquidityBenefits.countDocuments(query).exec();

    res.json({
      success: true,
      data: liquidityBenefits,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 添加流动性收益记录
const addLiquidityBenefit = handleAsync(async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    rewards: req.body.rewards
      ? mongoose.Types.Decimal128.fromString(
          Number(req.body.rewards).toFixed(2),
        )
      : req.body.rewards,
  };

  const newLiquidityBenefit = new LiquidityBenefits(body);
  const savedLiquidityBenefit = await newLiquidityBenefit.save();

  res.json({
    success: true,
    data: savedLiquidityBenefit,
  });
});

// 根据 ID 获取流动性收益记录
const getLiquidityBenefitById = handleAsync(
  async (req: Request, res: Response) => {
    const liquidityBenefit = await LiquidityBenefits.findById(req.params.id);

    res.json({
      success: true,
      data: liquidityBenefit,
    });
  },
);

// 更新流动性收益记录
const updateLiquidityBenefit = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const body = {
      ...req.body,
      rewards: req.body.rewards
        ? mongoose.Types.Decimal128.fromString(
            Number(req.body.rewards).toFixed(2),
          )
        : req.body.rewards,
    };

    const updatedLiquidityBenefit = await LiquidityBenefits.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: updatedLiquidityBenefit,
    });
  },
);

// 删除流动性收益记录
const deleteLiquidityBenefit = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const liquidityBenefit = await LiquidityBenefits.findByIdAndDelete(id);

    res.json({
      success: true,
      message: liquidityBenefit,
    });
  },
);

// 批量删除流动性收益记录
const deleteMultipleLiquidityBenefits = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await LiquidityBenefits.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} liquidity benefits deleted successfully`,
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleLiquidityBenefits,
  updateLiquidityBenefit,
  deleteLiquidityBenefit,
  getLiquidityBenefits,
  addLiquidityBenefit,
  getLiquidityBenefitById,
};
