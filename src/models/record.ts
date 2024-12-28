import mongoose, { Document } from 'mongoose';

export interface IRecord extends Document {
  user: mongoose.Types.ObjectId; // 关联用户
  topic: mongoose.Types.ObjectId; // 关联到 Topic
  answer: mongoose.Types.ObjectId; // 关联到 Answer
}

const recordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      required: true,
    },
  },
  { timestamps: true },
);

const Record = mongoose.model<IRecord>('Record', recordSchema);

export default Record;
