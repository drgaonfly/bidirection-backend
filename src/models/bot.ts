import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IBotUser } from './botUser';
import { IGroup } from './group';
import { IGroupMessage } from './groupMessage';

export interface IBot extends Document {
  id: string;
  token: string;
  botName: string;
  userName: string;
  remark?: string;
  user: mongoose.Schema.Types.ObjectId | IUser;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;

  message: string;
  contact?: string;
  /** 媒体文件（图片、视频等） */
  medias?: Array<{
    type: 'photo' | 'video' | 'document';
    fileId?: string;
    url?: string;
  }>;
  /** 按钮配置 */
  buttons?: Array<{
    text: string;
    type: 'url' | 'callback' | 'copy';
    value?: string;
    showAlert?: boolean;
    row?: number; // 所在行号，从 1 开始，默认 1；同一行号的按钮并排显示
  }>;

  menus: IMenu[];
  isOnline: boolean;
  botUsers: mongoose.Schema.Types.ObjectId[] | IBotUser[];
  groups: mongoose.Schema.Types.ObjectId[] | IGroup[];
  owner?: mongoose.Schema.Types.ObjectId | IBotUser;
  groupMessages: mongoose.Schema.Types.ObjectId[] | IGroupMessage[]; // 虚拟字段
  session?: string;

  type?: 'public' | 'custom';
  clonedFrom?: mongoose.Schema.Types.ObjectId | IBot;

  webhook_url: string;
  isCreatedByAdmin?: boolean;

  /** 当前激活的话题群组（用于多群组时指定哪个群接收消息） */
  activeTopicGroup?: mongoose.Types.ObjectId | IGroup;
  /** 话题双向通信功能订阅到期时间（null = 未订阅/已过期） */
  topicSubscriptionExpiredAt?: Date;
  /** 即将到期提醒是否已发送（续费后自动重置） */
  topicSubscriptionNotified?: boolean;
  /** 是否启用话题模式双向通信（owner 手动开关） */
  isTopicModeEnabled?: boolean;

  /** 话题模式试用期开始时间（每个 bot 独立计算，创建时自动赋值） */
  topicTrialStartedAt?: Date;

  /** 自动回复规则 */
  autoReplies?: Array<{
    keyword: string; // 触发关键词
    fuzzy: boolean; // true = 包含匹配，false = 完全匹配
    reply: string; // 回复内容（纯文本）
  }>;

  createdAt?: any;
}

export interface IMenu extends Document {
  menuName: string;
  url: string;
}

const menuSchema = new mongoose.Schema({
  menuName: { type: String, required: true },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return /^(http|https):\/\/.*/.test(v);
      },
      message: (props: any): string => `${props.value} 不是一个有效的 URL!`,
    },
  },
});

const botSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    token: { type: String, required: true, unique: true, trim: true },
    botName: { type: String, trim: true },
    userName: { type: String, trim: true },
    remark: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    botUser: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    message: { type: String, trim: true },
    isOnline: { type: Boolean, default: true },
    botUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      default: null,
    },
    menus: { type: [menuSchema], default: [] },
    session: { type: String, trim: true },
    contact: { type: String, trim: true },
    medias: {
      type: [
        {
          type: {
            type: String,
            enum: ['photo', 'video', 'document'],
            required: true,
          },
          fileId: { type: String, trim: true },
          url: { type: String, trim: true },
        },
      ],
      default: [],
    },
    buttons: {
      type: [
        {
          text: { type: String, required: true },
          type: {
            type: String,
            enum: ['url', 'callback', 'copy'],
            required: true,
          },
          value: { type: String, trim: true },
          showAlert: { type: Boolean, default: false },
          row: { type: Number, default: 1 },
        },
      ],
      default: [],
    },

    type: { type: String, enum: ['public', 'custom'], default: 'custom' },
    clonedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      default: null,
    },

    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    webhook_url: { type: String, trim: true },
    isCreatedByAdmin: { type: Boolean, default: false },

    activeTopicGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    topicSubscriptionExpiredAt: {
      type: Date,
      default: null,
    },
    topicSubscriptionNotified: {
      type: Boolean,
      default: false,
    },
    isTopicModeEnabled: {
      type: Boolean,
      default: false,
    },
    topicTrialStartedAt: {
      type: Date,
      default: null,
    },
    autoReplies: {
      type: [
        {
          keyword: { type: String, required: true, trim: true },
          fuzzy: { type: Boolean, default: false },
          reply: { type: String, required: true, trim: true },
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

botSchema.virtual('groupMessages', {
  ref: 'GroupMessage',
  localField: '_id',
  foreignField: 'bot',
});

const Bot = mongoose.model<IBot>('Bot', botSchema);

export default Bot;
