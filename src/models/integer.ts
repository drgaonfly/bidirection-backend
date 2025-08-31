import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IBot } from './bot';

export interface IInteger extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  user: mongoose.Schema.Types.ObjectId | IUser;
  amount: number;
}

const integerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

const Integer = mongoose.model<IInteger>('Integer', integerSchema);

export default Integer;
