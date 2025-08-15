import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 多态关联类型定义

export interface IDeduction extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  amount: number; // 扣款金额
  currency: string; // 扣款币种 (USDT, TRX等)
  reason: string; // 扣款原因
  type: string; // 扣款类型 (service_fee, penalty, subscription等)
  status: string; // 扣款状态
  hash: string; // 交易哈希
  txid: string; // 交易ID
  from_address: string; // 扣款来源地址
  to_address: string; // 扣款目标地址
  fee: number; // 手续费
  balance_before: number; // 扣款前余额
  balance_after: number; // 扣款后余额
  remark: string; // 备注
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date; // 处理时间
  proxy: mongoose.Types.ObjectId | IUser; // 代理

  // 多态关联
  deductable_type: string;
  deductable: mongoose.Types.ObjectId; // 关联的对象ID，比如 rental
}

// 扣款记录 Schema
const deductionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: false,
    },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['USDT', 'TRX', 'BTC', 'ETH'],
      default: 'TRX',
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    hash: {
      type: String,
      required: false,
    },
    txid: {
      type: String,
      required: false,
    },
    from_address: {
      type: String,
      required: false,
    },
    to_address: {
      type: String,
      required: false,
    },
    balance_before: {
      type: Number,
      required: false,
    },
    balance_after: {
      type: Number,
      required: false,
    },
    remark: {
      type: String,
      required: false,
    },
    processedAt: {
      type: Date,
      required: false,
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    // 多态关联字段
    type: {
      type: String,
      required: true,
      enum: ['Rental', 'Recharge', 'PackageOrder'],
    },
    deductable: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'type', // 多态关联
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Deduction = mongoose.model<IDeduction>('Deduction', deductionSchema);

export default Deduction;
