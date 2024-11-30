import mongoose, { Document } from 'mongoose';

export interface IWithdrawal extends Document {
  _id: string;
  customer: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  withdrawalId: string;
}

const withdrawalSchema = new mongoose.Schema(
  {
    withdrawalId: {
      type: String,
      unique: true,
      required: true,
      default: (): string => `W${Date.now()}`,
      comment: '提现单号',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      comment: '客户ID',
    },
    amount: { type: Number, required: true, min: 0, comment: '提现金额' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      required: true,
      comment: '提现状态',
    },
    bankAccount: {
      type: String,
      required: true,
      trim: true,
      comment: '银行账号',
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      comment: '开户行名称',
    },
    accountHolder: {
      type: String,
      required: true,
      trim: true,
      comment: '账户持有人姓名',
    },
    remarks: { type: String, trim: true, comment: '备注' },
    completedAt: { type: Date, comment: '完成时间' },
  },
  {
    timestamps: true,
  },
);

const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);

export default Withdrawal;
