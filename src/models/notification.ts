import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer'; // 假设你有一个 User 模型
import { IUser } from './user';
export interface INotification extends Document {
  id: string;
  title: string;
  content: string;
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  user: mongoose.Schema.Types.ObjectId | IUser;
  createdAt?: Date; // 创建时间
  updatedAt?: Date; // 更新时间
}

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: false },
    title: { type: String, required: false },
    content: { type: String, required: false },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
  },
  { timestamps: true },
);

const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);

export default Notification;
