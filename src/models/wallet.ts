import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IChannel } from './channel';

export interface IWallet extends Document {
  id: string;
  user: mongoose.Schema.Types.ObjectId | IUser;
  channel: mongoose.Schema.Types.ObjectId | IChannel;
  network: 'TRX' | 'BSC' | 'ETH';
  address: string;
  secretKey: string;
  usdtOfwallet: number;
  usdtOfstake: number;
  usdtOfplatform: number;
  ethOfplatform: number;
}

const walletSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: false,
    },
    network: {
      type: String,
      enum: ['TRX', 'BSC', 'ETH'],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    secretKey: {
      type: String,
      required: false,
    },
    usdtOfwallet: {
      type: Number,
      default: 0,
    },
    usdtOfstake: {
      type: Number,
      default: 0,
    },
    usdtOfplatform: {
      type: Number,
      default: 0,
    },
    ethOfplatform: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);

export default Wallet;
