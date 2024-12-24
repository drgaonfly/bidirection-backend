import mongoose, { Document } from 'mongoose';
import { IMenu } from './menu';

export interface ITopic extends Document {
  video1: string;
  video2: string;
  enum: string;
  answers: string[];
  menu: IMenu; // 关联到 Menu
}

const topicSchema = new mongoose.Schema(
  {
    video1: { type: String, required: true },
    video2: { type: String, required: true },
    enum: {
      type: String,
      required: true,
      enum: ['normal', 'unfriendly', 'recogError', 'videoError'],
    },
    answers: [{ type: String, required: true }],
    menu: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  },
  { timestamps: true },
);

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic;
