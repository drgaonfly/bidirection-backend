import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IPackage } from './package';
import { IUser } from './user';

// 套餐购买记录接口定义
export interface IPackageOrder extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot; // 属于哪个机器人
  botUser: mongoose.Schema.Types.ObjectId | IBotUser; // 购买用户
  package: mongoose.Schema.Types.ObjectId | IPackage; // 购买的套餐
  packageName: string; // 套餐名称
  times: number; // 笔数
  price: number; // 价格
  energy: number; // 能量 (sun)
  validityDays: number; // 有效期（天）
  minConsumption: number; // 低销多少钱
  paymentType: 'trx' | 'usdt'; // 扣款类型
  expiredAt: Date; // 过期时间
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'completed'; // 状态
  proxy: mongoose.Types.ObjectId | IUser; // 代理
  orderNumber: string; // 订单号
  transactionHash?: string; // 交易哈希
  paidAt?: Date; // 支付时间
  activatedAt?: Date; // 激活时间
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
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    packageName: {
      type: String,
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
      enum: ['pending', 'active', 'expired', 'cancelled', 'completed'],
      required: true,
      default: 'pending',
    },
    proxy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    transactionHash: {
      type: String,
      required: false,
    },
    paidAt: {
      type: Date,
      required: false,
    },
    activatedAt: {
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

// 添加索引以提高查询性能
packageOrderSchema.index({ bot: 1, botUser: 1 });
packageOrderSchema.index({ status: 1 });
packageOrderSchema.index({ expiredAt: 1 });
packageOrderSchema.index({ orderNumber: 1 });

const PackageOrder = mongoose.model<IPackageOrder>(
  'PackageOrder',
  packageOrderSchema,
);

export default PackageOrder;
