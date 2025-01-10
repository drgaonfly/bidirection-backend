import mongoose, { Document } from 'mongoose';
import { IWallet } from './wallet';

export interface IUser extends Document {
  wallets: IWallet[];
  isAdmin: boolean;
  isCustomService: boolean;
  roles: any;
  email: string;
  password: string;
  name: string;
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
  live: boolean;
  inviteCode: string;
  memberNum: number;
  commissionRate: number;
}

const userSchema = new mongoose.Schema(
  {
    wallets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet', // Reference the Wallet model
        required: false,
      },
    ],
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false },
    live: {
      type: Boolean,
      default: true,
    },
    isCustomService: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role', // Reference the Role model
      },
    ],
    inviteCode: {
      type: String,
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    memberNum: {
      type: Number,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
