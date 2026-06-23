import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';

export interface IUser extends Document {
  id: string;
  isAdmin: boolean;
  roles: any;
  bots?: mongoose.Schema.Types.ObjectId[] | IBot[];
  email: string;
  password: string;
  name: string;
  live: boolean;

  proxy: mongoose.Schema.Types.ObjectId | IUser;
  creator: mongoose.Schema.Types.ObjectId | IUser;

  twoFAEnabled: boolean; // 是否启用双因素认证
  twoFASecret?: string; // 加密后的TOTP密钥（正式）
  temp2FASecret?: string; // 临时存储的TOTP密钥（用于激活过程）
  twoFABackupCodes?: string[]; // 备用代码（可选增强）

  /** TRC20 收款地址（用于话题订阅收款） */
  trx20_address?: string;

  /** 话题双向通信月费（USDT），默认 25 */
  topicSubscriptionMonthlyFee: number;

  // 话题双向通信免费试用期 (day)
  topic_mode_trial_period: number;

  passwordChangedAt: Date;
  lastLoginAt: Date; // 最新登录时间
  lastLoginIp: string; // 最新登录IP

  isOnline: boolean;
  lastOnline: Date; // 最后在线时间
}

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: false, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: false },
    live: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    twoFAEnabled: {
      type: Boolean,
      default: false,
    },
    twoFASecret: {
      type: String,
      select: false,
      default: null,
    },
    temp2FASecret: {
      type: String,
      select: false,
      default: null,
    },

    twoFABackupCodes: [
      {
        type: String,
        select: false,
      },
    ],

    passwordChangedAt: Date,
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },

    trx20_address: { type: String, trim: true },
    topicSubscriptionMonthlyFee: { type: Number, default: 25 },
    topic_mode_trial_period: { type: Number, default: 1 },

    lastOnline: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field for bots
userSchema.virtual('bots', {
  ref: 'Bot',
  localField: '_id',
  foreignField: 'user',
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
