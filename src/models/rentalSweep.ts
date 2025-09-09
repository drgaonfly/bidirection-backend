import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';

export interface IRentalSweep extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot;
  amount: number; // trx
  from: string;
  to: string;
  tx_id: string;
  status: string;
  error: string;
}

const rentalSweepSchema = new mongoose.Schema(
  {
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    amount: { type: Number, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    tx_id: { type: String, required: false },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'failed', 'success'],
      default: 'pending',
    },
    error: { type: String, required: false },
  },
  {
    timestamps: true,
  },
);

const RentalSweep = mongoose.model<IRentalSweep>(
  'RentalSweep',
  rentalSweepSchema,
);

export default RentalSweep;
