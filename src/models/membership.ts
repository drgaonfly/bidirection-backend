import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';

export interface IMembership extends Document {
  id: string;
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  membershipType: 'basic' | 'premium' | 'vip';
  startDate: Date;
  endDate: Date;
  lastRenewalDate?: Date;
  benefits: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    id: { type: String, required: true, unique: true }, // 会员唯一ID
    botUser: {
      type: Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    }, // 关联的BotUser
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    }, // 关联的Bot
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
    }, // 会员状态：pending-待处理，paid-已付款，expired-已过期，cancelled-已取消
    startDate: { type: Date, required: true }, // 开始日期
    endDate: { type: Date, required: true }, // 结束日期
    lastRenewalDate: { type: Date }, // 最近续费日期
    benefits: [{ type: String }], // 会员权益
    notes: { type: String }, // 备注
  },
  { timestamps: true },
);

const Membership = mongoose.model<IMembership>('Membership', membershipSchema);

export default Membership;
