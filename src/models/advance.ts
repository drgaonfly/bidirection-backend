import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';

// 预支（Advance）接口定义
export interface IAdvance extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  from_address: string;
  to_address: string;
  amount: number; // 预支能量数
  price: number; // 预支价格，单位trx
  tx_id: string; // 交易哈希
  status: string;
  crypto_type: 'usdt' | 'trx';
  expiredAt: Date; // 订单过期时间
  transactionAt: Date;
}

const advanceSchema = new Schema<IAdvance>(
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
    amount: {
      type: Number,
      required: true,
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
      required: true,
    },
    tx_id: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'expired'],
      required: true,
      default: 'pending',
    },
    crypto_type: {
      type: String,
      enum: ['usdt', 'trx'],
      required: true,
    },
    expiredAt: {
      type: Date,
      required: false,
    },
    transactionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Advance = mongoose.model<IAdvance>('Advance', advanceSchema);

export default Advance;
