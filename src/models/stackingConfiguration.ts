import mongoose, { Document } from 'mongoose';

export interface IStackingConfiguration extends Document {
  investBalance: number;
  rateOfReturn: number;
  profit: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const stackingConfigurationSchema = new mongoose.Schema(
  {
    investBalance: { type: Number, required: true, dedualt: 0 },
    rateOfReturn: { type: Number, required: true, default: 0 },
    profit: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

const StackingConfiguration = mongoose.model<IStackingConfiguration>(
  'StackingConfiguration',
  stackingConfigurationSchema,
);

export default StackingConfiguration;
