import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

export interface IBotUserMessage extends Document {
  content: string;
  type: 'sent' | 'received' | 'error';
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  proxy: mongoose.Types.ObjectId | IUser;
}

const botUserMessageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['sent', 'received', 'error'],
      default: 'sent',
      required: true,
    },
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

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  { timestamps: true },
);

const BotUserMessage = mongoose.model<IBotUserMessage>(
  'BotUserMessage',
  botUserMessageSchema,
);

export default BotUserMessage;
