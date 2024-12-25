import mongoose, { Document } from 'mongoose';

export interface IAnswer extends Document {
  brandName: string;
  packageImageUrl: string;
  skuName: string;
  sn: string;
  spec: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const answerSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    packageImageUrl: { type: String, required: true },
    skuName: { type: String, required: true },
    sn: { type: String, required: true },
    spec: { type: String, required: true },
  },
  { timestamps: true },
);

const Answer = mongoose.model<IAnswer>('Answer', answerSchema);

export default Answer;
