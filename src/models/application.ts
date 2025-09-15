import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';

// 代理申请接口定义
export interface IApplication extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  status: string;
  remark: string;
}

const applicationSchema = new Schema<IApplication>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    botUser: {
      type: Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing'],
      default: 'pending',
    },
    remark: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Application = mongoose.model<IApplication>(
  'Application',
  applicationSchema,
);

export default Application;
