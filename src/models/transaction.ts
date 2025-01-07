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
      type: String,
      enum: ['USDT', 'PledgeBalance'],
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
      required: true,
    },
    currentBalance: {
      type: Number,
      required: true,
    },
    previousBalance: {
      type: Number,
      required: true,
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
