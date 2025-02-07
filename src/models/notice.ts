import mongoose, { Document } from 'mongoose';
import { IUser } from './user';

export interface INotice extends Document {
  customer: mongoose.Schema.Types.ObjectId | IUser;
  title: string;
  type: string;
  content: string;
  creator: string;
  createdAt?: Date;
  updatedAt?: Date;
  readAt?: Date;
}

const noticeSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: false },
    type: {
      type: String,
      enum: ['notice', 'announcement'],
      required: false,
    },
    content: { type: String, required: false },
    creator: { type: String, required: false },
    readAt: { type: Date, required: false },
  },
  { timestamps: true },
);

const Notice = mongoose.model<INotice>('Notice', noticeSchema);

export default Notice;
