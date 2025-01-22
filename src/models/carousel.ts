import mongoose, { Document } from 'mongoose';

export interface ICarousel extends Document {
  image: string;
  alt: string;
  path: string;
  lan: 'en' | 'zh';
  size: string;
  type: 'jpg' | 'png' | 'jpeg';
  createdAt?: Date;
  updatedAt?: Date;
}

const carouselSchema = new mongoose.Schema(
  {
    image: { type: String, required: false },
    alt: { type: String, required: false },
    path: { type: String, required: false },
    lan: { type: String, required: false, enum: ['en', 'zh'] },
    size: { type: String, required: false },
    type: { type: String, required: false, enum: ['jpg', 'png', 'jpeg'] },
  },
  { timestamps: true },
);

const Carousel = mongoose.model<ICarousel>('Carousel', carouselSchema);

export default Carousel;
