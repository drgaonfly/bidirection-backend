import mongoose, { Document } from 'mongoose';

export interface ICarousel extends Document {
  image: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const carouselSchema = new mongoose.Schema(
  {
    image: { type: String, required: false },
    status: { type: Boolean, required: false },
  },
  { timestamps: true },
);

const Carousel = mongoose.model<ICarousel>('Carousel', carouselSchema);

export default Carousel;
