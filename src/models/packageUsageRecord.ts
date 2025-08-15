import mongoose, { Document, Schema } from 'mongoose';
import { IPackageOrder } from './packageOrder';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 套餐使用记录接口定义
export interface IPackageUsageRecord extends Document {
  id: string;
  packageOrder: mongoose.Schema.Types.ObjectId | IPackageOrder; // 关联的套餐订单
  bot: mongoose.Schema.Types.ObjectId | IBot; // 机器人
  botUser: mongoose.Schema.Types.ObjectId | IBotUser; // 机器人用户
  proxy: mongoose.Schema.Types.ObjectId | IUser; // 代理
  address: string; // 使用地址
  status: 'success' | 'failed' | 'pending'; // 使用状态
  usedTimes: number; // 使用的笔数
  usedAt: Date; // 使用时间
  notes?: string; // 备注（可选）
  createdAt: Date;
  updatedAt: Date;
}

const packageUsageRecordSchema = new Schema<IPackageUsageRecord>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    packageOrder: {
      type: Schema.Types.ObjectId,
      ref: 'PackageOrder',
      required: true,
    },
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    botUser: {
      type: Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    proxy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      required: true,
      default: 'pending',
    },
    usedTimes: {
      type: Number,
      required: true,
      min: 1,
    },
    usedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
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

const PackageUsageRecord = mongoose.model<IPackageUsageRecord>(
  'PackageUsageRecord',
  packageUsageRecordSchema,
);

export default PackageUsageRecord;
