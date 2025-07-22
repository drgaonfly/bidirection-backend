import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';

export interface IAnynoumy extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  from_address: string;
  to_address: string;
  amount: number; // 订单价格
  actual_amount: number; // 实际支付价格
  tx_id: string; // 交易哈希
  status: string;
  crypto_type: string;
  has4: boolean;
  days: number; // 租赁天数
  startAt: Date; // 租赁开始时间
  endAt: Date; // 租赁结束时间
  expiredAt: Date; // 订单过期时间
  transactionAt: Date;
}

const anynoumySchema = new mongoose.Schema(
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
    from_address: {
      type: String,
      required: false,
    },
    to_address: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    }, // 订单价格
    actual_amount: {
      type: Number,
      required: false,
    }, // 实际支付价格
    tx_id: {
      type: String,
      required: false,
    }, // 交易哈希
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'cancelled', 'expired', 'operating'],
      default: 'pending',
    },
    crypto_type: {
      type: String,
      required: true,
      enum: ['usdt', 'trx'],
    },
    has4: {
      type: Boolean,
      required: false,
      default: false,
    },
    days: {
      type: Number,
      required: true,
    }, // 租赁天数
    startAt: {
      type: Date,
      required: false,
    }, // 租赁开始时间
    endAt: {
      type: Date,
      required: false,
    }, // 租赁结束时间
    expiredAt: {
      type: Date,
      required: false,
    }, // 订单过期时间
    transactionAt: {
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

const Anynoumy = mongoose.model<IAnynoumy>('Anynoumy', anynoumySchema);

export default Anynoumy;
