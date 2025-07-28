import mongoose, { Document } from 'mongoose';

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

  energyReceiveAddress?: string; // 收能量地址
  rechargeAddress?: string; // 充值地址
  energy_privateKey?: string; // 能量发送私钥
  mnemonic?: string; // 助记词

  twoFAEnabled: boolean; // 是否启用双因素认证
  twoFASecret?: string; // 加密后的TOTP密钥（正式）
  temp2FASecret?: string; // 临时存储的TOTP密钥（用于激活过程）
  twoFABackupCodes?: string[]; // 备用代码（可选增强）

  trx_balance: number; // TRX 余额

  passwordChangedAt: Date;
  lastLoginAt: Date; // 最新登录时间
  lastLoginIp: string; // 最新登录IP

  isOnline: boolean;
  lastOnline: Date; // 最后在线时间
}

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: false, unique: true },
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

    energyReceiveAddress: { type: String, required: false }, // 能量接收地址

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

    trx_balance: { type: Number, default: 0 }, // TRX 余额
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
  },
  { timestamps: true },
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
