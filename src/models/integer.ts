import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';

export interface IInteger extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  amount: number;
  type: string; // 多态
  integrable: mongoose.Types.ObjectId; // 关联的对象ID，比如 rental
}

const integerSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ['Rental', 'PackageOrder'],
    },
    integrable: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'type', // 多态关联
    },
  },
  { timestamps: true },
);

const Integer = mongoose.model<IInteger>('Integer', integerSchema);

export default Integer;
