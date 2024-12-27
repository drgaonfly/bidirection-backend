import mongoose, { Document } from 'mongoose';
// import { IAnswer } from './answer';

export interface ITopic extends Document {
  videoUrl: string;
  issue: string;
  answers: mongoose.Types.ObjectId;
}

const topicSchema = new mongoose.Schema(
  {
    videoUrl: { type: String, trim: true },
    issue: {
      type: String,
      required: true,
      enum: ['normal', 'unfriendly', 'recogError', 'videoError'],
    },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
  },
  { timestamps: true },
);

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic;
