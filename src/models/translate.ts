import mongoose, { Document } from 'mongoose';
import { ILangue } from './langue';

export interface ITranslate extends Document {
  translate: string[];
  langue: mongoose.Schema.Types.ObjectId[] | ILangue[];
  createdAt?: Date;
  updatedAt?: Date;
}

const translateSchema = new mongoose.Schema(
  {
    translate: { type: String },
    langue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'langue' }],
  },
  { timestamps: true },
);

const Translate = mongoose.model<ITranslate>('Translate', translateSchema);

export default Translate;
