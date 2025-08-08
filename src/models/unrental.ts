import mongoose, { Document, Schema } from 'mongoose';
import { IRental } from './rental';
import { IUser } from './user';

// 能量解除租用接口定义
export interface IUnRental extends Document {
  rental: mongoose.Schema.Types.ObjectId | IRental;
  status: string;
  hash: string;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
}

const unRentalSchema = new Schema<IUnRental>(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: true,
    },
    hash: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['delegated', 'undelegated', 'failed'],
      required: true,
      default: 'delegated',
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const UnRental = mongoose.model<IUnRental>('UnRental', unRentalSchema);

export default UnRental;
