import mongoose, { Document } from 'mongoose';
import { IWallet } from './wallet';

export interface ITransaction extends Document {
  wallet: mongoose.Schema.Types.ObjectId | IWallet;
  type:
    | 'WithdrawalFailed'
    | 'Pledge'
    | 'StaticIncome'
    | 'LotteryReward'
    | 'TransferOut'
    | 'TransferIn';
  transactedBalance: number;
  currentBalance: number;
  previousBalance: number;
}

const transactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'WithdrawalFailed',
        'Pledge',
        'StaticIncome',
        'LotteryReward',
        'TransferOut',
        'TransferIn',
      ],
      required: true,
    },
    transactedBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model<ITransaction>(
  'Transaction',
  transactionSchema,
);

export default Transaction;
