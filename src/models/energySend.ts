import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';
import { IRental } from './rental';
import { IPackageUsageRecord } from './packageUsageRecord';

// 能量发送接口定义
export interface IEnergySend extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Types.ObjectId | IUser;
  rental: mongoose.Schema.Types.ObjectId | IRental;
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  from_address: string;
  to_address: string;
  amount: number; // 发送能量数
  separation: number; // 笔数
  price: number; // 发送价格，单位trx
  actual_price: number;
  tx_id: string; // 交易哈希
  limit_hour: number;
  status: string;
  energySendAddress: string;
  type: 'flash' | 'daily'; // 闪租还是日租
  limit_day: number; // 日租用小时
  createdAt: Date;
}

const energySendSchema = new Schema<IEnergySend>(
  {
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: false,
    },
    botUser: {
      type: Schema.Types.ObjectId,
      ref: 'BotUser',
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }, // 代理
    amount: {
      type: Number,
      required: true,
    },
    separation: {
      type: Number,
      required: false,
      default: 1,
    },
    from_address: {
      type: String,
      required: false,
    },
    to_address: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: false,
    },
    actual_price: {
      type: Number,
    },
    tx_id: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    limit_hour: {
      type: Number,
      required: false,
    },
    limit_day: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      required: false,
      enum: ['pending', 'success', 'failed', 'recycled'],
      default: 'pending',
    },
    energySendAddress: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: true,
      enum: ['flash', 'daily'], // flash=闪租, daily=日租
    },
    packageUsageRecord: {
      type: Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const EnergySend = mongoose.model<IEnergySend>('EnergySend', energySendSchema);

export default EnergySend;
