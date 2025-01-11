import mongoose, { Document } from 'mongoose';
import { IWallet } from './wallet';

export interface IWalletDealRecord extends Document {
  wallet: mongoose.Schema.Types.ObjectId | IWallet;
  paymentAddress: string;
  balance: number;
  hash: string;
  type: 'collection' | 'staking' | 'withdraw';
  status: 'pending' | 'success' | 'fail';
  isOperativeOnAdmin: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const walletDealRecordSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      required: false,
    },
    paymentAddress: {
      type: String,
      default: null,
      required: false,
    },
    hash: {
      type: String,
      default: null,
      required: false,
    },
    type: {
      type: String,
      enum: ['collection', 'staking', 'withdraw'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'fail'],
      required: true,
    },
    isOperativeOnAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const WalletDealRecord = mongoose.model<IWalletDealRecord>(
  'WalletDealRecord',
  walletDealRecordSchema,
);

export default WalletDealRecord;
