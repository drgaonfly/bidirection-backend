import mongoose, { Document } from 'mongoose';
import Wallet, { IWallet } from './wallet';

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

transactionSchema.pre('save', async function (next) {
  const wallet = await Wallet.findById(this.wallet);
  if (wallet) {
    wallet.balance = wallet.balance + this.transactedBalance; // 根据需求调整逻辑
    await wallet.save();
  }
  next();
});

const Transaction = mongoose.model<ITransaction>(
  'Transaction',
  transactionSchema,
);

export default Transaction;
