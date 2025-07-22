import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';

export interface IInteger extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  amount: number;
  approach: string;
}

const integerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    amount: { type: Number, required: true },
    approach: {
      type: String,
      required: true,
      enum: ['invitation', 'recharge'],
    },
  },
  { timestamps: true },
);

const Integer = mongoose.model<IInteger>('Integer', integerSchema);

export default Integer;
