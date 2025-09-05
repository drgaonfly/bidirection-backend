import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IRental } from './rental';
import { IPackageUsageRecord } from './packageUsageRecord';

// 能量解除租用接口定义
export interface IUnRental extends Document {
  id: string;
  rental: mongoose.Schema.Types.ObjectId | IRental;
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  from: string;
  to: string;
  amount: number; // 租赁能量数
  separation: number; // 笔数
  limit_hour: number;
  limit_day: number;
  status: string;
  hash: string; // 回收哈希
  txid: string; // rental的发送哈希txid
  price: number;
  error: string;
  energySendAddress: string;
}

const unRentalSchema = new Schema<IUnRental>(
  {
    id: {
      type: String,
      required: false,
    },
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: false,
    },
    packageUsageRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
      required: false,
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
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: false,
    },
    energySendAddress: {
      type: String,
      required: false,
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
      required: false,
    },
    limit_day: {
      type: Number,
      required: false,
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
      required: false,
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
