import mongoose, { Document } from 'mongoose';
import { IExchange } from './exchange';
import { IUser } from './user';

// 转账接口定义
export interface ITransfer extends Document {
  exchange: mongoose.Types.ObjectId | IExchange;
  hash: string; // 收款哈希
  txid: string; // 转账哈希
  from: string;
  to: string;
  status: string;
  trxAmount: number;
  proxy: mongoose.Types.ObjectId | IUser; // 代理
}

// 转账 Schema
const transferSchema = new mongoose.Schema(
  {
    exchange: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exchange',
      required: true,
      unique: true,
    },
    trxAmount: {
      type: Number,
      required: false,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
    txid: {
      type: String,
      required: false,
      sparse: true, // 允许多个 null/undefined
      unique: true,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['completed', 'failed', 'pending'],
      default: 'pending',
    },
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 添加联合索引: sending_hash, receiving_hash
transferSchema.index({ hash: 1, txid: 1 }, { unique: true });

const Transfer = mongoose.model<ITransfer>('Transfer', transferSchema);

export default Transfer;
