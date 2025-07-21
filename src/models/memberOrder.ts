import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IBotUserConfig } from './botUserConfig';

export interface IMemberOrder extends Document {
  orderNumber: string;
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  botUserConfig: Schema.Types.ObjectId | IBotUserConfig;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  membershipType: string;
  startDate: Date;
  endDate: Date;
  paymentAddress: string; // 收款地址
  createdAt: Date;
  updatedAt: Date;
}

const memberOrderSchema = new Schema<IMemberOrder>(
  {
    orderNumber: { type: String, required: true, unique: true }, // 订单号
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
    }, // 订单状态
    amount: { type: Number, required: true }, // 金额
    membershipType: { type: String, required: true }, // 会员类型
    startDate: { type: Date, required: true }, // 开始日期
    endDate: { type: Date, required: true }, // 结束日期
    paymentAddress: { type: String, required: true }, // 收款地址
  },
  { timestamps: true },
);

const MemberOrder = mongoose.model<IMemberOrder>(
  'MemberOrder',
  memberOrderSchema,
);

export default MemberOrder;
