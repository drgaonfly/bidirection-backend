import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IBot } from './bot';

export interface IRevenueShare extends Document {
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  amount: number;
  balance_type: string; // 余额类型
  type: string; // 多态
  revenue_shareable: mongoose.Types.ObjectId;
}

const revenueShareSchema = new mongoose.Schema(
  {
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }, // User who is receiving the revenue share
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    amount: { type: Number, required: true },
    balance_type: {
      type: String,
      required: true,
      enum: ['usdt_balance', 'trx_balance'],
    },
    type: {
      type: String,
      required: true,
      enum: ['Rental', 'PackageOrder'],
    },
    revenue_shareable: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'type', // 多态关联
    },
  },
  {
    timestamps: true,
  },
);

const RevenueShare = mongoose.model<IRevenueShare>(
  'RevenueShare',
  revenueShareSchema,
);

export default RevenueShare;
