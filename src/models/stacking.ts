import mongoose, { Document } from 'mongoose';

export interface IStacking extends Document {
  investBalance: number;
  rateOfReturn: number;
  profit: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const stackingSchema = new mongoose.Schema(
  {
    investBalance: { type: Number, required: true, dedualt: 0 },
    rateOfReturn: { type: Number, required: true, default: 0 },
    profit: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

const Stacking = mongoose.model<IStacking>('Stacking', stackingSchema);

export default Stacking;
