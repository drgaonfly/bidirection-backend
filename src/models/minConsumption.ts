import mongoose, { Document } from 'mongoose';
import { IPackageOrder } from './packageOrder';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IUser } from './user';

export interface IMinConsumption extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  packageOrder: mongoose.Schema.Types.ObjectId | IPackageOrder;
  pens: number;
  energy: number; // 回收多少能量
  tx_id: string;
}

const minConsumptionSchema = new mongoose.Schema(
  {
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' },
    botUser: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packageOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PackageOrder' },
    pens: { type: Number, required: true },
    energy: { type: Number, required: true },
    tx_id: { type: String, required: true },
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
