import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user';

// TypeScript interface for BillTransaction
export interface IBillTransaction extends Document {
  uploadTime: string; // Time the bill was uploaded
  code: string; // Unique code for the transaction
  file: string; // File associated with the transaction
  user: mongoose.Schema.Types.ObjectId | IUser; // User associated with the transaction
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
}

// Mongoose schema definition for BillTransaction
const billTransactionSchema = new mongoose.Schema<IBillTransaction>({
  uploadTime: { type: String, required: false }, // 新增上传时间字段
  code: { type: String, required: false },
  file: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Mongoose model for BillTransaction
const BillTransaction = mongoose.model<IBillTransaction>('BillTransaction', billTransactionSchema);

export default BillTransaction;