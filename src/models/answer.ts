import mongoose, { Document } from 'mongoose';

export interface IAnswer extends Document {
  name: string;
  image: string;
  createdAt?: Date;
  updatedAt?: Date;
  topic: mongoose.Types.ObjectId;
  answerCount: number; // 添加数量字段
}

const answerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    answerCount: { type: Number, required: true, default: 1 }, // 添加数量字段，默认为 1
  },
  { timestamps: true },
);

const Answer = mongoose.model<IAnswer>('Answer', answerSchema);

export default Answer;
