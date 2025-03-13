import mongoose, { Document } from 'mongoose';
import { ICustomer } from './customer';

export interface IWithdraw extends Document {
  id: string;
  customer: mongoose.Schema.Types.ObjectId | ICustomer;
  amount: number;
  status: string;
  remark: string;
}

const withdrawSchema = new mongoose.Schema(
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
    amount: { type: Number },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
    }, // 审核状态
    remark: {
      type: String,
      default: '',
    }, // 备注
  },
  { timestamps: true },
);

const Withdraw = mongoose.model<IWithdraw>('Withdraw', withdrawSchema);

export default Withdraw;
