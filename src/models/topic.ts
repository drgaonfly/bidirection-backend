import mongoose, { Document } from 'mongoose';
import { IAnswer } from './answer';

export interface ITopic extends Document {
  video1: string;
  video2?: string;
  topicNumber: number;
  answers: Array<mongoose.Types.ObjectId | IAnswer>;
  correctAnswer: Array<{
    answer: mongoose.Types.ObjectId | IAnswer;
    count: number;
  }>;
}

const topicSchema = new mongoose.Schema(
  {
    video1: { type: String, trim: true, required: true },
    video2: { type: String, trim: true, required: false },
    topicNumber: { type: Number, required: true, unique: true },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
    correctAnswer: [
      {
        answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' },
        count: { type: Number, default: 1 },
      },
    ],
  },
  { timestamps: true },
);

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic;
