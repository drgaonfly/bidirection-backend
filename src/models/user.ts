import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';

export interface IPricePair extends Document {
  name: string;
  type: string;
  aqusition: number; // 得到多少能量(sun)
  expiration: number; // 有效时间 (hour)
  commission: number; // 代理分佣 (trx)
  times: number; // 笔数
}

export interface IUser extends Document {
  id: string;
  isAdmin: boolean;
  roles: any;
  bots?: mongoose.Schema.Types.ObjectId[] | IBot[];
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

  withdraw_address?: string; // 提款地址，这是用来给代理发送提款的地址
  withdraw_privateKey?: string; // 提款发送私钥, 这是用来给代理发送提款地址的私钥

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
  /**
   * 最低销回收时间 单位小时
   */
  recycle_min: number;

  // 快速回收时间
  quick_recycle_time: number; // 分钟

  feedback_id: number; // 错误反馈的botUser id

  all_trx_to: string; // 所有闪租收款地址的trx到这个地址

  plain_password: string; // 明文密码

  fragment_hash?: string;

  fragment_cookie?: string;
}

const pricePairSchema = new mongoose.Schema({
  name: { type: String, required: false },
  type: { type: String, required: true, enum: ['hourly', 'daily'] },
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

    energy_address: { type: String, required: false }, // TRX20 地址
    energy_privateKey: { type: String, required: false, select: false }, // 能量发送私钥
    mnemonic: { type: String, required: false, select: false }, // 购买会员助记词

    withdraw_address: { type: String, required: false }, //  提现地址
    withdraw_privateKey: { type: String, required: false, select: false }, //  提现地址私钥

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

    price_pairs: {
      type: [pricePairSchema],
      default: [],
    },

    // 充值涨最小值
    recharge_min: { type: Number, default: 0 },
    // 充值涨最大值
    recharge_max: { type: Number, default: 0 },

    // 每笔多少能量
    energy_per_times: { type: Number, default: 65000 },

    recycle_min: { type: Number, default: 5 },

    // quick_recycle_time:
    quick_recycle_time: { type: Number, default: 1 },

    feedback_id: { type: Number, required: false },

    // 指定的收走闪租的收款地址里全部trx的地址
    all_trx_to: { type: String, required: false },

    plain_password: { type: String, select: false },

    fragment_hash: { type: String, required: false },

    fragment_cookie: { type: String, required: false },
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
