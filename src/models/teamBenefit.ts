import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer';

export interface ITeamBenefit extends Document {
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  usdtIncome: number;
  ethIncome: number; // 以太坊实时收益
}

const teamBenefitSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    ethIncome: { type: Number, default: 0 }, // 以太坊实时收益
    usdtIncome: { type: Number, required: true }, // USDT收益
  },
  {
    timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
  },
);

const TeamBenefit = mongoose.model<ITeamBenefit>(
  'TeamBenefit',
  teamBenefitSchema,
);

export default TeamBenefit;
