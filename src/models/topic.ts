import mongoose, { Document } from 'mongoose';
// import { IAnswer } from './answer';

export interface ITopic extends Document {
  video1: string;
  video2: string;
  issue: string;
  answer: mongoose.Types.ObjectId;
}

const topicSchema = new mongoose.Schema(
  {
    video1: { type: String, trim: true },
    video2: { type: String, trim: true },
    issue: {
      type: String,
      required: true,
      enum: ['normal', 'unfriendly', 'recogError', 'videoError'],
    },
    answer: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
  },
  { timestamps: true },
);

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic;
