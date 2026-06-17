import mongoose, { Document } from 'mongoose';
import { IBotUserMessage } from './botUserMessage';
import { IUser } from './user';
import { IBot } from './bot';

export interface IBotUser extends Document {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  messages: mongoose.Types.ObjectId[] | IBotUserMessage[];
  isAuthorized: boolean; // 用户是否已授权
  displayName?: string; // 虚拟属性
  proxy: mongoose.Types.ObjectId | IUser;
  bots: mongoose.Types.ObjectId[] | IBot[];
  createdAt: Date;
  updatedAt: Date;
}

const botUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userName: { type: String, required: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BotUserMessage' }],
    isAuthorized: { type: Boolean, default: false }, // 默认未授权
    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理归属
    bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }], // 用户绑定的机器人
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

botUserSchema.index({ id: 1, bot: 1 }, { unique: true });

botUserSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'botUser',
});

// 新增 displayName 虚拟属性
botUserSchema.virtual('displayName').get(function (this: any) {
  // 优先 userName，其次 firstName + lastName
  if (this.userName) {
    return this.userName;
  }
  const first = this.firstName || '';
  const last = this.lastName || '';
  return `${first} ${last}`.trim();
});

const BotUser = mongoose.model<IBotUser>('BotUser', botUserSchema);

export default BotUser;
