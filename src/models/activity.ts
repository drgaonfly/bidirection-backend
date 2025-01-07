import mongoose, { Document } from 'mongoose';

export interface IActivity extends Document {
  customerId: mongoose.Schema.Types.ObjectId;
  activityId: string;
  activityType: string;
  usdtAmount: number;
  ethEarnings: number;
  lockDays: number;
  startTime: Date;
  endTime: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const activitySchema = new mongoose.Schema(
  {
    customer: { ype: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    activityId: { type: String, required: true },
    activityType: { type: String, required: true },
    usdtAmount: { type: Number, required: true },
    ethEarnings: { type: Number, required: true },
    lockDays: { type: Number, required: false },
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
  },
  { timestamps: true },
);

const Activity = mongoose.model<IActivity>('Activity', activitySchema);

export default Activity;
