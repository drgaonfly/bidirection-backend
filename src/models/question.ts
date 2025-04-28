import mongoose, { Document } from 'mongoose';

export interface IQuestion extends Document {
  id: string;
  lang:
    | 'en'
    | 'zh'
    | 'zh-TW'
    | 'ja'
    | 'ko'
    | 'it'
    | 'fr'
    | 'pt'
    | 'ru'
    | 'ar'
    | 'hi'
    | 'bg'
    | 'es'
    | 'de'
    | 'tr';
  type: 'exchange' | 'serve';
  content: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lang: {
      type: String,
      enum: [
        'en',
        'zh',
        'zh-TW',
        'ja',
        'ko',
        'it',
        'fr',
        'pt',
        'ru',
        'ar',
        'hi',
        'bg',
        'es',
        'de',
        'tr',
      ],
      required: false,
    },
    type: {
      type: String,
      enum: ['exchange', 'serve'],
      required: false,
    },
    title: { type: String, required: false },
    content: { type: String, required: false },
  },
  { timestamps: true },
);

const Question = mongoose.model<IQuestion>('Question', questionSchema);

export default Question;
