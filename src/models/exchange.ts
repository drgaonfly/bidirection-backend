import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';

enum Crypto {
  usdt = 'usdt',
  trx = 'trx',
}

// 交易接口定义
export interface IExchange extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  from_crypt: string; // 被兑换的币种
  to_crypt: string; // 需兑换的币种
  from_amount: number; // 被兑换的金额
  to_amount: number; // 需兑换的金额
  rate: number; // 兑换时的汇率
  fee: number; // 兑换时的手续费
  status: string; // 兑换状态
  hash: string; // 兑换时的哈希
  createdAt: Date;
  updatedAt: Date;
}

// 交易 Schema
const exchangeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    from_crypt: {
      type: String,
      required: true,
      enum: Object.values(Crypto),
    },
    to_crypt: {
      type: String,
      required: true,
      enum: Object.values(Crypto),
    },
    from_amount: {
      type: Number,
      required: true,
    },
    to_amount: {
      type: Number,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
    },
    hash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Exchange = mongoose.model<IExchange>('Exchange', exchangeSchema);

export default Exchange;
