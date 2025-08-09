import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user';
import { IBot } from './bot';
import { IRental } from './rental';

// 能量解除租用接口定义
export interface IUnRental extends Document {
  rental: mongoose.Schema.Types.ObjectId | IRental;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  amount: number; // 租赁能量数
  separation: number; // 笔数
  limit_hour: number;
  status: string;
  hash: string; // 回收哈希
  price: number;
  actual_price: number;
}

const unRentalSchema = new Schema<IUnRental>(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: true,
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    separation: {
      type: Number,
      required: true,
    },
    limit_hour: {
      type: Number,
      required: true,
    },
    hash: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      required: true,
      default: 'pending',
    },
    price: {
      type: Number,
      required: true,
    },
    actual_price: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const UnRental = mongoose.model<IUnRental>('UnRental', unRentalSchema);

export default UnRental;
