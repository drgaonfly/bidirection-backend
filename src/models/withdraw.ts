import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IWallet } from './wallet';

export interface IWithdraw extends Document {
  user: mongoose.Schema.Types.ObjectId | IUser; // 关联用户
  wallet: mongoose.Schema.Types.ObjectId | IWallet; // 关联钱包
  withdrawalNumber: number;
  time: Date;
  withdrawalMethod: string;
  reviewStatus: string;
  paymentStatus: string;
  amount: number;
}

const withdrawSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    withdrawalNumber: { type: Number },
    time: { type: Date }, // 申请时间
    withdrawalMethod: {
      type: String,
      required: true,
      enum: ['WeChat', 'Alipay', 'Cash', 'Other'],
      default: 'WeChat',
    }, // 提现方式
    reviewStatus: {
      type: String,
      required: true,
      enum: ['reviewed', 'unreviewed', 'reviewing'],
      default: 'unreviewed',
    }, // 审核状态
    paymentStatus: {
      type: String,
      required: true,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    }, // 打款状态
    amount: { type: Number }, // 提现金额(元)
  },
  { timestamps: true },
);

const Withdraw = mongoose.model<IWithdraw>('Withdraw', withdrawSchema);

export default Withdraw;
