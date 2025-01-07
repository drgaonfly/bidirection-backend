import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer';

export interface IWallet extends Document {
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  network: 'TRX' | 'BSC' | 'ETH';
  type: 'USDT' | 'PledgeBalance';
  address: string;
  balance: number;
}

const walletSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    network: {
      type: String,
      enum: ['TRX', 'BSC', 'ETH'],
      required: true,
    },
    type: {
      type: String,
      enum: ['USDT', 'PledgeBalance'],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);

export default Wallet;
