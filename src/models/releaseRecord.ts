import mongoose, { Document } from 'mongoose';

export interface IReleaseRecord extends Document {
  customerId: number; // 客户ID
  activityId: number; // 活动ID
  chainName: string; // 链名称
  walletAddress: string; // 钱包地址
  agentUser: number; // 代理用户
  applyTime: Date; // 申请时间
  status: 'pending' | 'success' | 'refused'; // 操作状态
  stakedUsdt: number; // 质押USDT数量
  rewardEth: number; // 奖励ETH数量
  lockDays: number; // 锁定天数
  createdAt?: Date;
  updatedAt?: Date;
}

const releaseRecordSchema = new mongoose.Schema(
  {
    customerId: { type: Number, required: true, comment: '客户ID' },
    activityId: { type: Number, required: true, comment: '活动ID' },
    chainName: { type: String, required: true, comment: '链名称' },
    walletAddress: { type: String, required: true, comment: '钱包地址' },
    agentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      comment: '代理用户',
    },
    applyTime: { type: Date, required: true, comment: '申请时间' },
    status: {
      type: String,
      enum: ['pending', 'success', 'refused'],
      required: true,
      comment: '操作状态',
    },
    stakedUsdt: { type: Number, required: true, comment: '质押USDT数量' },
    rewardEth: { type: Number, required: true, comment: '奖励ETH数量' },
    lockDays: { type: Number, required: true, comment: '锁定天数' },
  },
  {
    timestamps: true,
  },
);

const ReleaseRecord = mongoose.model<IReleaseRecord>(
  'releaseRecord',
  releaseRecordSchema,
);

export default ReleaseRecord;
