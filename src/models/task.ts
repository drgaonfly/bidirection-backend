import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  country: string;
  platform: string;
  file: string; // Assuming this might be a URL or file path
  user: Schema.Types.ObjectId; // Reference to a User model
  quantity: number;
  store: string; // Assuming the store name or ID as a simple string; adjust if this is a reference
  orderNumber: string;
  amount: number;
  buyerAccount: string; // Assuming a simple string; adjust if this needs to be more complex
}

const TaskSchema: Schema = new Schema({
  country: { type: String, required: true },
  platform: { type: String, required: true },
  file: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, required: true },
  store: { type: String, required: true },
  orderNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  buyerAccount: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
