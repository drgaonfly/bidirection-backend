import mongoose, { Schema, model, Document } from 'mongoose';
import { IUser } from './user';

interface ITgStarsOrder extends Document {
  orderNumber: string;
  botUser: Schema.Types.ObjectId;
  bot: Schema.Types.ObjectId;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  starsAmount: number;
  endDate: Date;
  actualAmount: number;
  paymentAddress: string;
  createdAt: Date;
  updatedAt: Date;
  hasPurchased: boolean;
  proxy: mongoose.Types.ObjectId | IUser;
}

const tgStarsOrderSchema = new Schema<ITgStarsOrder>(
  {
    orderNumber: { type: String, required: true, unique: true }, // 订单号
    botUser: { type: Schema.Types.ObjectId, ref: 'BotUser', required: true }, // 关联BotUser
    bot: { type: Schema.Types.ObjectId, ref: 'Bot', required: true }, // 关联Bot
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
    amount: { type: Number, required: true }, // 支付金额
    actualAmount: { type: Number, required: false }, // 实际收款金额
    starsAmount: { type: Number, required: true }, // 星星数量
    endDate: { type: Date, required: true }, // 订单结束时间
    paymentAddress: { type: String, required: true }, // 收款地址
    hasPurchased: { type: Boolean, default: false }, // 是否已购买星星

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  {
    timestamps: true,
  },
);

const TgStarsOrder = model<ITgStarsOrder>('TgStarsOrder', tgStarsOrderSchema);

export default TgStarsOrder;
