import mongoose, { Document } from 'mongoose';

export interface ILiquidityBenefits extends Document {
  stakingmin: number;
  stakingmax: number;
  rewards: number;
  profitmax: number;
  profitmin: number;
}

const liquidityBenefitsSchema = new mongoose.Schema(
  {
    stakingmin: { type: Number, required: true }, //质押最小值
    stakingmax: { type: Number, required: true }, //质押最大值
    rewards: { type: Number, required: true }, //收益
    profitmax: { type: Number, required: true }, //最大收益
    profitmin: { type: Number, required: true }, //最小收益
  },
  { timestamps: true },
);

const LiquidityBenefits = mongoose.model<ILiquidityBenefits>(
  'LiquidityBenefits',
  liquidityBenefitsSchema,
);

export default LiquidityBenefits;
