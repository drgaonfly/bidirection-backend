import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IUser } from './user';

export interface IPremium extends Document {
  id: string;
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  proxy: mongoose.Types.ObjectId | IUser;
  status: string;
  amount: number; // usdt
  actualAmount: number; // 实际收款金额, usdt
  months: number; // 开通月数
  from: string;
  to: string;
  hash: string;
  tx_id: string;
  expiredAt: Date;
}

const premiumSchema = new Schema<IPremium>(
  {
    id: { type: String, required: true, unique: true }, // 订单号
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
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
    status: {
      type: String,
      enum: [
        'pending', // 待支付
        'success', // 已支付
        'expired', // 已过期
        'cancelled', // 已取消
        'failed',
      ],
      default: 'pending',
    }, // 订单状态
    amount: { type: Number, required: true }, // 金额
    actualAmount: { type: Number, required: false }, // 实际收款金额
    months: { type: Number, required: false }, // 开通月数
    from: { type: String, required: false }, // 付款地址
    to: { type: String, required: true }, // 收款地址
    hash: { type: String, required: false }, // 交易哈希
    tx_id: { type: String, required: false }, // 交易ID
    expiredAt: { type: Date, required: true }, // 过期日期
  },
  { timestamps: true },
);

const Premium = mongoose.model<IPremium>('Premium', premiumSchema);

export default Premium;
