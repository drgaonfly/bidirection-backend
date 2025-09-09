import mongoose, { Document, Schema } from 'mongoose';
import { IPackageUsageRecord } from './packageUsageRecord';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';
import { IRental } from './rental';

// 能量使用接口定义
export interface IEnergyUsage extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  rental: mongoose.Schema.Types.ObjectId | IRental;
  type: string; // 使用类型, 给自己用，还是给他人用，闪租
  address: string; // 被监控的地址，也就是套餐使用记录存储的address
  energy: number; // 消耗的能量
  bandwidth: number; // 消耗的带宽
  tx_id: string;
  pens: number; // 笔数
  amount: number; // 转出多少usdt
  to_address: string; // 转出地址
  transactionAt: Date;
  createdAt: Date;
  isRecycled: boolean;
}

const energyUsageSchema = new Schema<IEnergyUsage>(
  {
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
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageUsageRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
      required: false,
    },
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: false,
    },
    type: {
      type: String,
      required: true,
      enum: ['PackageOrder', 'Rental'],
    },
    energy: {
      type: Number,
      required: true,
    },
    bandwidth: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: false,
    },
    tx_id: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    pens: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    to_address: {
      type: String,
      required: true,
    },
    transactionAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const EnergyUsage = mongoose.model<IEnergyUsage>(
  'EnergyUsage',
  energyUsageSchema,
);

export default EnergyUsage;
