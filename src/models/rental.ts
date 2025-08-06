import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

export const Options = [
  { separation: 5, label: '5笔', callback: 'rental_sep_5' },
  { separation: 10, label: '10笔', callback: 'rental_sep_10' },
  { separation: 20, label: '20笔', callback: 'rental_sep_20' },
  { separation: 50, label: '50笔', callback: 'rental_sep_50' },
];

// 能量租用接口定义
export interface IRental extends Document {
  id: string;
  from_address: string;
  to_address: string;
  amount: number; // 租赁能量数
  separation: number; // 笔数
  price: number; // 租赁价格，单位trx
  tx_id: string; // 交易哈希
  hash: string; // 接收哈希
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  time: number; // 交易时间
  type: string;
  status: string;
  crypto_type: 'usdt' | 'trx';
  startAt: Date; // 租赁开始时间
  endAt: Date; // 租赁结束时间
  expiredAt: Date; // 订单过期时间
  limit_hour: number;
  transactionAt: Date;
  actual_price: number;
  proxy: mongoose.Types.ObjectId | IUser;
}

const rentalSchema = new Schema<IRental>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
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
    time: {
      type: Number,
      required: false,
    },
    price: {
      type: Number,
      required: true,
    },
    tx_id: {
      type: String,
      required: false,
    },
    hash: {
      type: String,
      required: false,
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

    type: {
      type: String,
      enum: ['manual', 'bot', 'auto'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'expired', 'failed'],
      required: true,
      default: 'pending',
    },
    crypto_type: {
      type: String,
      enum: ['usdt', 'trx'],
      required: true,
    },
    startAt: {
      type: Date,
      required: false,
    },
    endAt: {
      type: Date,
      required: false,
    },
    expiredAt: {
      type: Date,
      required: false,
    },
    limit_hour: {
      type: Number,
    },
    transactionAt: {
      type: Date,
    },
    actual_price: {
      type: Number,
    },

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Rental = mongoose.model<IRental>('Rental', rentalSchema);

export default Rental;
