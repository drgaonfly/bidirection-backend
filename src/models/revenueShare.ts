import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';

export interface IRevenueShare extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  amount: number;
}

const revenueShareSchema = new mongoose.Schema(
  {
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    amount: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

const RevenueShare = mongoose.model<IRevenueShare>(
  'RevenueShare',
  revenueShareSchema,
);

export default RevenueShare;
