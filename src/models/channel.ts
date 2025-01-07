import mongoose, { Document } from 'mongoose';

export interface IChannel extends Document {
  customer: mongoose.Schema.Types.ObjectId;
  channelCode: string;
  agentUser: string;
  walletAddress: string;
  customerCount: number;
  isOnline: boolean;
  updatedAt?: Date;
}

const channelSchema = new mongoose.Schema(
  {
    customer: { ype: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    channelCode: { type: String, required: true },
    agentUser: { type: String, required: true },
    walletAddress: { type: String },
    customerCount: { type: Number },
    isOnline: { type: Boolean, required: true },
  },
  { timestamps: true },
);

const Channel = mongoose.model<IChannel>('Channel', channelSchema);

export default Channel;
