import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IBotUserConfig } from './botUserConfig';

export interface IMembership extends Document {
  id: string;
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  botUserConfig: Schema.Types.ObjectId | IBotUserConfig;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  membershipType: string;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    id: { type: String, required: true, unique: true }, // ID
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
    botUserConfig: {
      type: Schema.Types.ObjectId,
      ref: 'BotUserConfig',
      required: true,
    }, // 关联的BotUserConfig
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
    }, // 会员状态：pending-待处理，paid-已付款，expired-已过期，cancelled-已取消
    amount: { type: Number, required: true }, // 会员金额
    membershipType: { type: String, required: true }, // 会员类型
    endDate: { type: Date, required: true }, // 结束日期
  },
  { timestamps: true },
);

const Membership = mongoose.model<IMembership>('Membership', membershipSchema);

export default Membership;
