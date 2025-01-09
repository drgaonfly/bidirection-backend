import mongoose, { Document } from 'mongoose';
import { IWallet } from './wallet';

export interface ILotteryRecord extends Document {
  wallet: mongoose.Schema.Types.ObjectId | IWallet;
  usdt: number;
  beInviteds: number;
  toInvites: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const lotteryRecordSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    usdt: {
      type: Number,
      default: 0,
      required: false,
    },
    beInviteds: {
      type: Number,
      default: 0,
      required: false,
    },
    toInvites: {
      type: Number,
      default: 0,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const LotteryRecord = mongoose.model<ILotteryRecord>(
  'LotteryRecord',
  lotteryRecordSchema,
);

export default LotteryRecord;
