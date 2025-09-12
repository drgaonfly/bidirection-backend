import mongoose, { Document } from 'mongoose';

export interface IRentalChange extends Document {
  energy_address: string;
  energy_privateKey: string; // 未加密
}

const rentalChangeSchema = new mongoose.Schema(
  {
    energy_address: {
      type: String,
      required: true,
    },
    energy_privateKey: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const RentalChange = mongoose.model<IRentalChange>(
  'RentalChange',
  rentalChangeSchema,
);

export default RentalChange;
