import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';
import { IBotUser } from './botUser';
import { IUser } from './user';

// 话题（Forum Topic）映射条目
export interface IBotUserTopic {
  botUserId: string; // BotUser.id（Telegram user id 字符串）
  threadId: number; // Telegram message_thread_id
  topicName?: string; // 话题名称
}

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
  // ── 话题模式 ──────────────────────────────────────────
  /** 群组是否已开启话题模式（Forum） */
  topicMode: boolean;
  /** 机器人是否拥有管理话题的权限（实时检测，此字段仅作缓存参考） */
  canManageTopics: boolean;
  /**
   * 引导步骤：
   *  0 = 未开始，等待开启话题模式
   *  1 = 话题模式已开，等待设机器人为管理员
   *  2 = 已是管理员，等待赋予管理话题权限
   *  3 = 配置完成
   */
  setupStep: number;
  /** BotUser → threadId 映射表 */
  botUserTopics: IBotUserTopic[];
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
    // ── 话题模式 ──────────────────────────────────────────
    topicMode: { type: Boolean, default: false },
    canManageTopics: { type: Boolean, default: false },
    setupStep: { type: Number, default: 0 },
    botUserTopics: {
      type: [
        {
          botUserId: { type: String, required: true },
          threadId: { type: Number, required: true },
          topicName: { type: String },
        },
      ],
      default: [],
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
