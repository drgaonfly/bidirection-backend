import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IUser } from './user';

export type SubscriptionStatus =
  | 'pending' // 已创建，等待链上付款
  | 'paid' // 已确认到账，订阅生效
  | 'expired' // 订阅已到期（by notifyTopicSubscriptionExpiration）
  | 'timeout'; // 订单超时未付款（超过 orderExpiredAt）

export interface ISubscription extends Document {
  bot: mongoose.Types.ObjectId | IBot;

  proxy: mongoose.Types.ObjectId | IUser;
  /** 应付月费金额（USDT） */
  amount: number;
  /** 收款地址（bot.trx20_address，创建时快照） */
  toAddress: string;
  /** 链上交易哈希（付款确认后填入） */
  txHash?: string;
  /** 付款来源地址（付款确认后填入） */
  fromAddress?: string;
  /** 实际到账金额（付款确认后填入） */
  paidAmount?: number;
  /** 付款确认时间 */
  paidAt?: Date;
  /** 订单超时时间（pending 状态下超过此时间则自动 timeout） */
  orderExpiredAt: Date;
  /** 本次订阅服务开始时间（付款确认后填入） */
  startDate?: Date;
  /** 本次订阅服务结束时间（付款确认后填入，startDate + 30 天） */
  endDate?: Date;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },
    toAddress: { type: String, required: true, trim: true },
    txHash: { type: String, trim: true, sparse: true },
    fromAddress: { type: String, trim: true },
    paidAmount: { type: Number },
    paidAt: { type: Date },
    orderExpiredAt: { type: Date, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'timeout'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ bot: 1, type: 1, status: 1 });
// txHash 唯一但允许为空（sparse）
subscriptionSchema.index({ txHash: 1 }, { unique: true, sparse: true });

const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);

export default Subscription;
