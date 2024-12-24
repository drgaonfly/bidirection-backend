import mongoose, { Document } from 'mongoose';
import { ITopic } from './topic';

export interface IRecord extends Document {
  user: mongoose.Schema.Types.ObjectId; // 关联用户
  topic: ITopic; // 关联到 Topic
  answer: string; // 答案
}

const recordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    answer: { type: String, required: true },
  },
  { timestamps: true },
);

const Record = mongoose.model<IRecord>('Record', recordSchema);

export default Record;
