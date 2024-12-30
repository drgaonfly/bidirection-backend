import mongoose, { Document } from 'mongoose';
import { ITopic } from './topic';

export interface IAnswer extends Document {
  name: string;
  image: string;
  createdAt?: Date;
  updatedAt?: Date;
  topic: mongoose.Types.ObjectId | ITopic;
  skuName: string;
  sn: string;
  spec: string;
  id: string;
}

const answerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    id: { type: String, required: true },
    skuName: { type: String, required: true },
    sn: { type: String, required: true },
    spec: { type: String, required: true },
  },
  { timestamps: true },
);

const Answer = mongoose.model<IAnswer>('Answer', answerSchema);

export default Answer;
