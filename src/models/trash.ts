import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';
import { IPackageOrder } from './packageOrder';

// 垃圾记录接口定义
export interface ITrash extends Document {
  id: string;
  packageOrder: mongoose.Schema.Types.ObjectId | IPackageOrder; // 关联的套餐订单
  bot: mongoose.Schema.Types.ObjectId | IBot; // 机器人
  botUser: mongoose.Schema.Types.ObjectId | IBotUser; // 机器人用户
  proxy: mongoose.Schema.Types.ObjectId | IUser; // 代理
  address: string; // 地址
  status: 'success' | 'failed' | 'pending' | 'recycling' | 'recycled'; // 状态
  recycling_status: 'success' | 'failed' | 'pending'; // 回收状态
  usedTimes: number; // 使用次数
  usedAt: Date; // 使用时间
  notes?: string; // 备注（可选）
  type: 'myself' | 'other'; // 类型
  createdAt: Date;
  hash: string; // 交易哈希
  recycling_hash: string; // 回收哈希
  record_value: number; // 记录值
  today_used_times: number; // 当天使用次数
}

const trashSchema = new Schema<ITrash>(
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
      required: true,
      default: 'pending',
    },
    recycling_status: {
      type: String,
      required: false,
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
    type: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    recycling_hash: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    record_value: {
      type: Number,
      required: false,
      default: 0,
    },
    today_used_times: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Trash = mongoose.model<ITrash>('Trash', trashSchema);

export default Trash;
