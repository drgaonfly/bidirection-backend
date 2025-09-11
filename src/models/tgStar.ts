import mongoose, { Schema, model, Document } from 'mongoose';
import { IUser } from './user';

interface ITgStar extends Document {
  id: string;
  botUser: Schema.Types.ObjectId;
  bot: Schema.Types.ObjectId;
  proxy: mongoose.Types.ObjectId | IUser;
  status: string;
  paymentAddress: string;
  amount: number;
  stars: number;
  actualAmount: number;
  hash: string; // 接受哈希
  tx_id: string; // api完成交易后发送的哈希
  expiredAt: Date;
}

const tgStarSchema = new Schema<ITgStar>(
  {
    id: { type: String, required: true, unique: true }, // 订单号
    botUser: { type: Schema.Types.ObjectId, ref: 'BotUser', required: true }, // 关联BotUser
    bot: { type: Schema.Types.ObjectId, ref: 'Bot', required: true }, // 关联Bot
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
    status: {
      type: String,
      enum: [
        'pending', // 待支付
        'success', // 已支付
        'expired', // 已过期
        'failed',
        'cancelled',
      ],
      default: 'pending',
    }, // 订单状态
    paymentAddress: { type: String, required: true }, // 收款地址
    amount: { type: Number, required: true }, // 支付金额
    actualAmount: { type: Number, required: false }, // 实际收款金额
    stars: { type: Number, required: true }, // 星星数量
    hash: { type: String, required: false }, // 接受哈希
    tx_id: { type: String, required: false }, // api完成交易后发送的哈希
    expiredAt: { type: Date, required: true }, // 订单结束时间
  },
  {
    timestamps: true,
  },
);

const TgStar = model<ITgStar>('TgStar', tgStarSchema);

export default TgStar;
