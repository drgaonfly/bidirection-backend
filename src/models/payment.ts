import mongoose, { Document, Schema } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { ISubscription } from './subscription';
import { IUser } from './user';

export const chargeOptions = [
  { amount: 100, label: '100 USDT', callback: 'charge_100:usdt' },
  { amount: 200, label: '200 USDT', callback: 'charge_200:usdt' },
  { amount: 300, label: '300 USDT', callback: 'charge_300:usdt' },
  { amount: 500, label: '500 USDT', callback: 'charge_500:usdt' },
  { amount: 100, label: '100 TRX', callback: 'charge_100:trx' },
  { amount: 200, label: '200 TRX', callback: 'charge_200:trx' },
  { amount: 300, label: '300 TRX', callback: 'charge_300:trx' },
  { amount: 500, label: '500 TRX', callback: 'charge_500:trx' },
  { amount: null, label: '其他金额【TRX】', callback: 'charge_custom_trx' },
  { amount: null, label: '其他金额【USDT】', callback: 'charge_custom_usdt' },
];

export interface IPayment extends Document {
  // wallet: Schema.Types.ObjectId | IWallet;
  id: string;
  orderNumber: string;
  // wallet: Schema.Types.ObjectId | IWallet;
  amount: number;
  paymentAmount: number; // 新增：实际支付金额
  status: 'pending' | 'paid' | 'expired';
  type: 'recharge' | 'subscription';
  txHash?: string;
  createdAt: Date;
  expiredAt: Date;
  sendAddress: string;
  receiveAddress?: string;
  // currency: 'USDT_ERC20' | 'USDT_TRC20';
  botUser: Schema.Types.ObjectId | IBotUser;
  bot: Schema.Types.ObjectId | IBot;
  subscription: Schema.Types.ObjectId | ISubscription; // 关联的订阅记录
  subscriptionInfo?: {
    price: number;
    type: string;
    days: number;
    label: string;
  };
  transactionAt?: Date; // 新增：交易时间
  tgChatId?: number; // 新增：Telegram Chat ID
  tgMessageId?: number; // 新增：Telegram Message ID
  crypto_type: string; // 新增：加密货币类型
  proxy: mongoose.Types.ObjectId | IUser;
}

const subscriptionInfoSchema = new Schema(
  {
    price: { type: Number, required: true },
    type: { type: String, required: true },
    days: { type: Number, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    id: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, unique: true },
    // wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
    amount: { type: Number, required: true },
    paymentAmount: { type: Number, required: false }, // 新增：实际支付金额
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
    },
    txHash: String,
    expiredAt: { type: Date, required: true },
    sendAddress: { type: String, required: false },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: false,
    }, // 关联的订阅记录
    type: {
      type: String,
      enum: ['recharge', 'subscription'],
      required: true,
    }, // 支付类型：充值或订阅
    // currency: {
    //   type: String,
    //   enum: ['USDT_ERC20', 'USDT_TRC20'],
    //   default: 'USDT_TRC20',
    // },
    botUser: {
      type: Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    }, // 订单发起者
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    }, // 订单所属的bot
    receiveAddress: { type: String, required: true },
    subscriptionInfo: {
      type: subscriptionInfoSchema,
      required: false,
    }, // 订阅信息详情
    transactionAt: { type: Date, required: false }, // 新增：交易时间
    tgChatId: { type: Number, required: false }, // 新增：Telegram Chat ID
    tgMessageId: { type: Number, required: false }, // 新增：Telegram Message ID
    crypto_type: { type: String, required: false, enum: ['usdt', 'trx'] }, // 新增：加密货币类型

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  { timestamps: true },
);

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
