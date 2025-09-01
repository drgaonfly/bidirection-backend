import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';

export interface IInteger extends Document {
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  amount: number;
}

const integerSchema = new mongoose.Schema(
  {
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

const Integer = mongoose.model<IInteger>('Integer', integerSchema);

export default Integer;
