import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IGroup } from './group';
export interface ITransaction extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  group: mongoose.Schema.Types.ObjectId | IGroup;
  amount: number;
  exchange_rate: number;
  fee_rate: number;
  type: string;
}

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String },
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    amount: { type: Number, required: true },
    exchange_rate: { type: Number, required: true },
    fee_rate: { type: Number, required: true },
    type: { type: String, required: true, enum: ['deposit', 'withdraw'] },
  },
  { timestamps: true },
);

const Transaction = mongoose.model<ITransaction>(
  'Transaction',
  transactionSchema,
);

export default Transaction;
