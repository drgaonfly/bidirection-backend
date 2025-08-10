import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user';
import { IBot } from './bot';
import { IRental } from './rental';

// 能量解除租用接口定义
export interface IUnRental extends Document {
  rental: mongoose.Schema.Types.ObjectId | IRental;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  from: string;
  to: string;
  amount: number; // 租赁能量数
  separation: number; // 笔数
  limit_hour: number;
  status: string;
  hash: string; // 回收哈希
  txid: string; // rental的发送哈希txid
  price: number;
  error: string;
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
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
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
      unique: true,
      sparse: true,
    },
    txid: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      required: false,
      default: 'pending',
    },
    price: {
      type: Number,
      required: true,
    },
    error: {
      type: String,
      required: false,
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
