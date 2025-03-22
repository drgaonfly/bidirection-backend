import mongoose, { Document } from 'mongoose';

export interface ITransfer extends Document {
  network: string;
  sender: string;
  adminWallet: string;
  adminAmount: number;
  adminHash: string;
  proxyWallet?: string;
  proxyAmount?: number;
  proxyHash?: string;
  type: 'direct' | 'agent';
  status: string;
}

const transferSchema = new mongoose.Schema(
  {
    network: { type: String, required: true },
    sender: { type: String, required: true },
    adminWallet: { type: String, required: true },
    adminAmount: { type: Number, required: true },
    adminHash: { type: String, required: true },
    proxyWallet: { type: String, required: false },
    proxyAmount: { type: Number, required: false },
    proxyHash: { type: String, required: false },
    type: {
      type: String,
      enum: ['direct', 'agent'],
      required: true,
    },
    status: { type: String, required: true },
  },
  { timestamps: true },
);

const Transfer = mongoose.model<ITransfer>('Transfer', transferSchema);

export default Transfer;
