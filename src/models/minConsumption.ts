import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IUser } from './user';
import { IPackageUsageRecord } from './packageUsageRecord';
import { IPackageOrder } from './packageOrder';

export interface IMinConsumption extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  packageOrder: mongoose.Schema.Types.ObjectId | IPackageOrder;
  packageUsageRecord: mongoose.Schema.Types.ObjectId | IPackageUsageRecord;
  pens: number;
}

const minConsumptionSchema = new mongoose.Schema(
  {
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' },
    botUser: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packageOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageOrder',
    },
    packageUsageRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageUsageRecord',
    },
    pens: { type: Number, required: true },
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
