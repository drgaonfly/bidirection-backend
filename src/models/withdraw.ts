import mongoose, { Document } from 'mongoose';
import { IUser } from './user';

export interface IWithdraw extends Document {
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  amount: number;
  type: string; // 类型
  status: string; // 状态
  address: string; // 提现到地址 , 必须是波场地址
  hash: string; // 接受哈希
  remark: string; // 备注
}

const withdrawSchema = new mongoose.Schema(
  {
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['usdt_balance', 'trx_balance'] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'refused', 'success', 'failed'],
      default: 'pending',
    },
    address: { type: String, required: true },
    hash: { type: String, required: false },
    remark: { type: String, required: false },
  },
  {
    timestamps: true,
  },
);

const Withdraw = mongoose.model<IWithdraw>('Withdraw', withdrawSchema);

export default Withdraw;
