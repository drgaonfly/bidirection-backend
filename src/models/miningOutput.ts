import mongoose, { Document } from 'mongoose';

export interface IMiningOutput extends Document {
  address: string;
  usdtNumber: number;
}

const miningOutputSchema = new mongoose.Schema(
  {
    address: { type: String, required: true }, // 钱包地址
    usdtNumber: { type: Number, default: 0 }, // USDT数量
  },
  { timestamps: true },
);

const MiningOutput = mongoose.model<IMiningOutput>(
  'MiningOutput',
  miningOutputSchema,
);

export default MiningOutput;
