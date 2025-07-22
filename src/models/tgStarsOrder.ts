import { Schema, model, Document } from 'mongoose';

interface ITgStarsOrder extends Document {
  orderNumber: string;
  botUser: Schema.Types.ObjectId;
  bot: Schema.Types.ObjectId;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  starsAmount: number;
  endDate: Date;
  paymentAddress: string;
  createdAt: Date;
  updatedAt: Date;
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
        'completed', // 已支付
        'cancelled', // 已取消
      ],
      default: 'pending',
    }, // 订单状态
    amount: { type: Number, required: true }, // 支付金额
    starsAmount: { type: Number, required: true }, // 星星数量
    endDate: { type: Date, required: true }, // 订单结束时间
    paymentAddress: { type: String, required: true }, // 收款地址
  },
  {
    timestamps: true,
  },
);

const TgStarsOrder = model<ITgStarsOrder>('TgStarsOrder', tgStarsOrderSchema);

export default TgStarsOrder;
