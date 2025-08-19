import mongoose, { Document, Schema } from 'mongoose';
import { IPackageUsageRecord } from './packageUsageRecord';

// 能量使用接口定义
export interface IEnergyUsage extends Document {
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  owner_address: string; // 套餐使用记录所存的地址
  consupmtion: number;
  contract_address: string;
  tx_id: string;
  transactionAt: Date;
}

const energyUsageSchema = new Schema<IEnergyUsage>(
  {
    packageUsageRecord: {
      type: Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
    },
    consupmtion: {
      type: Number,
      required: true,
    },
    owner_address: {
      type: String,
      required: false,
    },
    contract_address: {
      type: String,
      required: false,
    },
    tx_id: {
      type: String,
      required: false,
    },
    transactionAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const EnergyUsage = mongoose.model<IEnergyUsage>(
  'EnergyUsage',
  energyUsageSchema,
);

export default EnergyUsage;
