import mongoose, { Document } from 'mongoose';

export interface IRecord extends Document {
  users: mongoose.Types.ObjectId; // 关联用户
  topics: mongoose.Types.ObjectId; // 关联到 Topic
  answers: mongoose.Types.ObjectId; // 关联到 Answer
}

const recordSchema = new mongoose.Schema(
  {
    users: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    answers: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      required: true,
    },
  },
  { timestamps: true },
);

const Record = mongoose.model<IRecord>('Record', recordSchema);

export default Record;
