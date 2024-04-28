import mongoose, { Document } from 'mongoose';
import { ITask } from './task';
import { IUser } from './user';

// TypeScript interface for Bill
export interface IBill extends Document {
  storeName: string;  // 店铺名字
  orderNumber: string;  // 订单号
  amount: number;  // 金额
  buyerId: string;  // 买手号
  task?: mongoose.Schema.Types.ObjectId | ITask;  // 关联的任务ID
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
  country?: string; // Country of the task
  uploadTime?: string; // Time the bill was uploaded
  user: mongoose.Schema.Types.ObjectId;
  customer: mongoose.Schema.Types.ObjectId | IUser;  // New field for the customer
  exchangeRate: number;
  serviceFee: number;
  paymentAmount: number;
  afterSales: boolean; 
}

// Mongoose schema definition for Bill
const billSchema = new mongoose.Schema<IBill>({
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  orderNumber: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  buyerId: {
    type: String,
    required: true,
    trim: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Task'  // Assuming a Task model exists
  },
  country: {
    type: String,
    required: false
  },
  uploadTime: {
    type: String,
    required: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'  // Assuming a User model exists
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'  // Assuming a User model exists
  },
  exchangeRate: { type: Number, required: false },
  serviceFee: { type: Number, required: false },
  paymentAmount: {
    type: Number,
    required: false
  },
  afterSales: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Mongoose model for Bill
const Bill = mongoose.model<IBill>('Bill', billSchema);

export default Bill;
