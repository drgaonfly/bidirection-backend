import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';

export interface IPricePair extends Document {
  aqusition: number; // 得到多少能量(sun)
  expiration: number; // 有效时间 (hour)
  commission: number; // 代理分佣 (trx)
  times: number; // 笔数
}

export interface IUser extends Document {
  id: string;
  isAdmin: boolean;
  roles: any;
  email: string;
  password: string;
  name: string;
  live: boolean;
  inviteCode: string;

  proxy: mongoose.Schema.Types.ObjectId | IUser;
  creator: mongoose.Schema.Types.ObjectId | IUser;

  rechargeAddress?: string; // 充值地址
  energy_privateKey?: string; // 能量发送私钥
  energy_address?: string; // 放能量地址
  mnemonic?: string; // 助记词

  twoFAEnabled: boolean; // 是否启用双因素认证
  twoFASecret?: string; // 加密后的TOTP密钥（正式）
  temp2FASecret?: string; // 临时存储的TOTP密钥（用于激活过程）
  twoFABackupCodes?: string[]; // 备用代码（可选增强）

  passwordChangedAt: Date;
  lastLoginAt: Date; // 最新登录时间
  lastLoginIp: string; // 最新登录IP

  isOnline: boolean;
  lastOnline: Date; // 最后在线时间

  price_pairs: IPricePair[];

  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  /**
   * 充值涨最小值
   */
  recharge_min: number;
  /**
   * 充值涨最大值
   */
  recharge_max: number;
  /**
   * 每笔多少能量
   */
  energy_per_times: number;
}

const pricePairSchema = new mongoose.Schema({
  aqusition: { type: Number, required: true },
  expiration: { type: Number, required: true },
  commission: { type: Number, required: true },
  times: { type: Number, required: true },
});

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: false },
    live: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    inviteCode: { type: String, required: true, unique: true },

    //创建者
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    //代理
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    rechargeAddress: { type: String, required: false }, // 充值地址
    energy_privateKey: { type: String, required: false, select: false }, // 能量发送私钥
    mnemonic: { type: String, required: false, select: false }, // 购买会员助记词

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

    lastOnline: { type: Date },

    energy_address: { type: String, required: false }, // TRX20 地址
    energy_address_privateKey: { type: String, required: false, select: false }, // TRX20 地址私钥

    price_pairs: {
      type: [pricePairSchema],
      default: [],
    },

    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // 充值涨最小值
    recharge_min: { type: Number, default: 0 },
    // 充值涨最大值
    recharge_max: { type: Number, default: 0 },

    // 每笔多少能量
    energy_per_times: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
