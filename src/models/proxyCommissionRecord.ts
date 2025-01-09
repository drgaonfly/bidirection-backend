import mongoose, { Document } from 'mongoose';
import { IWallet } from './wallet';

export interface IProxyCommissionRecord extends Document {
  wallet: mongoose.Schema.Types.ObjectId | IWallet;
  paymentAddress: String;
  balance: number;
  hash: String;
  createdAt?: Date;
  updatedAt?: Date;
}

const proxyCommissionRecordSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

const ProxyCommissionRecord = mongoose.model<IProxyCommissionRecord>(
  'ProxyCommissionRecord',
  proxyCommissionRecordSchema,
);

export default ProxyCommissionRecord;
