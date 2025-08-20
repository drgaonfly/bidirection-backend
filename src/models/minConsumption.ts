import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IUser } from './user';
import { IPackageUsageRecord } from './packageUsageRecord';

export interface IMinConsumption extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  pens: number;
  energy: number; // 回收多少能量
}

const minConsumptionSchema = new mongoose.Schema(
  {
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' },
    botUser: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packageUsageRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
    },
    pens: { type: Number, required: true },
    energy: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

const MinConsumption = mongoose.model<IMinConsumption>(
  'MinConsumption',
  minConsumptionSchema,
);

export default MinConsumption;
