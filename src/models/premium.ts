import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IUser } from './user';

export interface IPremium extends Document {
  id: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  limit_month: number; // 1, 3, 12
  from_address: string;
  to_address: string;
  crypto_type: string;
  tx_id: string;
  expiredAt: Date;
  transactionAt: Date;
  proxy: mongoose.Types.ObjectId | IUser;
}

const premiumSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    limit_month: { type: Number, required: true, enum: [1, 3, 12] },
    from_address: { type: String, required: true },
    to_address: { type: String, required: false },
    crypto_type: { type: String, required: true, enum: ['usdt', 'trx'] },
    tx_id: { type: String, required: false },
    expiredAt: { type: Date, required: true },
    transactionAt: { type: Date, required: false },

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
  },
  { timestamps: true },
);

const Premium = mongoose.model<IPremium>('Premium', premiumSchema);

export default Premium;
