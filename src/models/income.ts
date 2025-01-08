import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer';

export interface Income extends Document {
  createdAt?: Date;
  updatedAt?: Date;
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  coinName: string;
  walletAddress: string;
  usdtEarnings: number;
  ethEarnings: number;
  earningsType: string;
  remarks?: string;
  sharedCustomerId?: string;
}

const IncomeSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    coinName: { type: String },
    walletAddress: { type: String },
    usdtEarnings: { type: Number },
    ethEarnings: { type: Number },
    earningsType: { type: String },
    remarks: { type: String, required: false },
    sharedCustomerId: { type: String, required: false },
  },
  { timestamps: true },
);

const Income = mongoose.model<Income>('Instruction', IncomeSchema);

export default Income;
