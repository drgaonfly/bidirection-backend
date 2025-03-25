import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer';
import { IUser } from './user';

export interface IRecord extends Document {
  id: string;
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  type: 'usdt to eth' | 'eth to usdt';
  amount: number;
  employee: mongoose.Schema.Types.ObjectId | IUser;
}

const recordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
  },
);

const Record = mongoose.model<IRecord>('Record', recordSchema);

export default Record;
