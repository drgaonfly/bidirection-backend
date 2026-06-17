import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 群组接口定义
export interface IGroup extends Document {
  id: number;
  title: string;
  type: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  creator: mongoose.Schema.Types.ObjectId | IBotUser;
  operators: (mongoose.Schema.Types.ObjectId | IBotUser)[]; // 操作人数组
  proxy: mongoose.Schema.Types.ObjectId | IUser;
  botUsers: (mongoose.Schema.Types.ObjectId | IBotUser)[];
  message: string;
  intervalTime: number; // 间隔时间
  updatedAt: Date;
  createdAt: Date;
}

// 群组 Schema
const groupSchema = new mongoose.Schema(
  {
    // ID
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    // 群组名称
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // 群组类型，不用显示在后台
    type: {
      type: String,
      required: true,
      default: 'supergroup',
    },
    // 所属机器人
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    // 认证者或创建者
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    // 操作人
    operators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotUser',
        required: false,
      },
    ],
    botUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotUser',
      },
    ],
    message: {
      type: String,
      required: false,
    },
    intervalTime: {
      type: Number,
      required: false,
    },
    proxy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Group = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
