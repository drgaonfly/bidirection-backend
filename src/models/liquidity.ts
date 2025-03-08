import mongoose, { Document } from 'mongoose';

export interface ILiquidityBenefits extends Document {
  usdtNumber: number;
  rewards: number;
  profit: number;
}

const liquidityBenefitsSchema = new mongoose.Schema(
  {
    usdtNumber: { type: Number, required: true },
    rewards: { type: Number, required: true },
    profit: { type: Number, required: true },
  },
  { timestamps: true },
);

const LiquidityBenefits = mongoose.model<ILiquidityBenefits>(
  'LiquidityBenefits',
  liquidityBenefitsSchema,
);

export default LiquidityBenefits;
