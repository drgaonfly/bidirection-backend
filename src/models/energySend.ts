import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 能量发送接口定义
export interface IEnergySend extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Types.ObjectId | IUser;
  from_address: string;
  to_address: string;
  energyFromAddress: string; // 能量来源地址
  amount: number; // 发送能量数
  separation: number; // 笔数
  price: number; // 发送价格，单位trx
  actual_price: number;
  tx_id: string; // 交易哈希
  limit_hour: number;
  status: string;
}

const energySendSchema = new Schema<IEnergySend>(
  {
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
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
    energyFromAddress: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: true,
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
    },
    status: {
      type: String,
      required: false,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
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
