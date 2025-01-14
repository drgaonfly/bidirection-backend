import mongoose, { Document } from 'mongoose';

export interface ILangue extends Document {
  image: string;
  code: string;
  name: string;
  title: string;
  isDefault: 'yes' | 'no';
  isOnline: boolean;
}

const langueSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    isDefault: { type: String, enum: ['yes', 'no'], default: 'no' },
    isOnline: { type: Boolean, required: true },
  },
  { timestamps: true },
);

const Langue = mongoose.model<ILangue>('Langue', langueSchema);

export default Langue;
