import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IGroup } from './group';
import { IUser } from './user';

// 消息类型q1
export enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  VOICE = 'voice',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  LOCATION = 'location',
  MENTION = 'mention',
  COMMAND = 'command',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file',
  CALLBACK_QUERY = 'callback_query', // 新增 callback_query
  OTHER = 'other',
  UNKNOWN = '未知消息类型',
}

// 只存客户发给机器人的消息（toBot），不存机器人发给客户的消息（fromBot）
export interface IBotMessage extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot; // 关联的机器人
  botUser?: mongoose.Schema.Types.ObjectId | IBotUser; // 发送消息的 BotUser
  messageType: string; // 消息类型，如 text, image, command 等
  content: string; // 消息内容
  raw?: any; // 原始消息体，可选
  group?: mongoose.Schema.Types.ObjectId | IGroup; // 关联的群（如果是群消息）
  // direction 字段移除，始终为 toBot
  proxy: mongoose.Types.ObjectId | IUser;
  /** 消息在 Telegram 中的原始 message_id */
  telegramMessageId?: number;
  /** 转发给对方后，对方那边的 message_id（用于 reaction 互转） */
  forwardedMessageId?: number;
  /** 转发给对方的 chat_id（owner 或客户的 telegram id） */
  forwardedToChatId?: number;
  /** 是否是 owner 回复给客户的消息 */
  isOwnerReply?: boolean;
  /** 消息标题（媒体消息） */
  caption?: string;
}

const botMessageSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    messageType: {
      type: String,
      required: true,
      enum: Object.values(MessageType),
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: false,
    },

    proxy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 代理
    telegramMessageId: { type: Number, required: false },
    forwardedMessageId: { type: Number, required: false },
    forwardedToChatId: { type: Number, required: false },
    isOwnerReply: { type: Boolean, default: false },
    caption: { type: String, required: false },
    // 不再存 direction 字段
  },
  {
    timestamps: true,
  },
);

const BotMessage = mongoose.model<IBotMessage>('BotMessage', botMessageSchema);

export default BotMessage;
