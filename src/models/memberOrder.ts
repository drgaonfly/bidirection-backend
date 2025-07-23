import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';

export interface IMemberOrder extends Document {
  orderNumber: string;
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  actualAmount: number; // 实际收款金额
  membershipType: string;
  months: number; // 开通月数
  endDate: Date;
  paymentAddress: string; // 收款地址
  hasPurchased: boolean; // 是否已购买会员
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
    status: {
      type: String,
      enum: [
        'pending', // 待支付
        'paid', // 已支付
        'expired', // 已过期
        'cancelled', // 已取消
      ],
      default: 'pending',
    }, // 订单状态
    amount: { type: Number, required: true }, // 金额
    actualAmount: { type: Number, required: false }, // 实际收款金额
    membershipType: { type: String, required: true }, // 会员类型
    months: { type: Number, required: false }, // 开通月数
    endDate: { type: Date, required: true }, // 结束日期
    paymentAddress: { type: String, required: true }, // 收款地址
    hasPurchased: { type: Boolean, default: false }, // 是否已购买会员
  },
  { timestamps: true },
);

const MemberOrder = mongoose.model<IMemberOrder>(
  'MemberOrder',
  memberOrderSchema,
);

export default MemberOrder;
