import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';

export interface ITronBalance extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  address: string;
  trx_amount: number;
  usdt_amount: number;
}

const tronBalanceSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    address: {
      type: String,
      required: true,
      unique: true,
    },
    trx_amount: {
      type: Number,
      required: true,
      default: 0,
    },
    usdt_amount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const TronBalance = mongoose.model<ITronBalance>(
  'TronBalance',
  tronBalanceSchema,
);

export default TronBalance;
