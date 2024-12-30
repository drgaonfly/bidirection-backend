import mongoose, { Document } from 'mongoose';
// import { IAnswer } from './answer';

export interface ITopic extends Document {
  video1: string;
  video2: string;
  answer: mongoose.Types.ObjectId;
  number: number; // 编号
  answerCount: number; // 数量
}

const topicSchema = new mongoose.Schema(
  {
    video1: { type: String, trim: true },
    video2: { type: String, trim: true },
    number: { type: Number, required: true },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' },
    answerCount: { type: Number, required: true, default: 1 }, // 添加数量字段，默认为 1
  },
  { timestamps: true },
);

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic;
