import mongoose, { Document } from 'mongoose';
import { IUser } from './user';

export interface ICustomer extends Document {
  id: string;
  logedinAt: Date;
  registerIP: string;
  loginIP: string;
  employee: mongoose.Schema.Types.ObjectId | IUser;
  invitedBy?: string;
  parent: mongoose.Schema.Types.ObjectId | ICustomer;
  children: ICustomer[];
  ownInviteCode?: string;
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  isOnline: boolean;
  lastOnline: Date; // 最后在线时间
  countryName: string;
  depth?: number;
}

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, //id
    logedinAt: { type: Date }, // 登录时间
    registerIP: { type: String }, // 创建IP
    loginIP: { type: String }, // 登录IP
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    }, // 员工
    invitedBy: { type: String, required: false }, //邀请人的邀请码
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    }, // 邀请人
    ownInviteCode: { type: String, required: false }, //自己的邀请码
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    }, // 代理
    isOnline: { type: Boolean, default: false }, //是否在线
    lastOnline: { type: Date }, // 最后在线时间
    countryName: { type: String, required: false }, //国家
    depth: { type: Number, default: 0 }, // 深度
  },
  {
    timestamps: true,
  },
);

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
