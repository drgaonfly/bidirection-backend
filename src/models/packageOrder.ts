import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 套餐购买记录接口定义
export interface IPackageOrder extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot; // 属于哪个机器人
  botUser: mongoose.Schema.Types.ObjectId | IBotUser; // 购买用户
  times: number; // 笔数
  price: number; // 价格
  energy: number; // 能量 (sun)
  validityDays: number; // 有效期（天）
  minConsumption: number; // 低销多少钱
  paymentType: 'trx' | 'usdt'; // 扣款类型
  expiredAt: Date; // 过期时间
  status: 'pending' | 'using' | 'expired'; // 状态
  proxy: mongoose.Types.ObjectId | IUser; // 代理
  createdAt: Date;
}

const packageOrderSchema = new Schema<IPackageOrder>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
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
    times: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    energy: {
      type: Number,
      required: true,
    },
    validityDays: {
      type: Number,
      required: true,
    },
    minConsumption: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['trx', 'usdt'],
      required: true,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
    },
    proxy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const PackageOrder = mongoose.model<IPackageOrder>(
  'PackageOrder',
  packageOrderSchema,
);

export default PackageOrder;
