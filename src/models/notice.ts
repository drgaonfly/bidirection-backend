import mongoose, { Document } from 'mongoose';

export interface INotice extends Document {
  customer: mongoose.Schema.Types.ObjectId;
  noticeTitle: string;
  noticeType: string;
  creator: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const noticeSchema = new mongoose.Schema(
  {
    customer: { ype: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    noticeTitle: { type: String, required: true },
    noticeType: { type: String, required: true },
    creator: { type: String, required: false },
  },
  { timestamps: true },
);

const Notice = mongoose.model<INotice>('Notice', noticeSchema);

export default Notice;
