import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';
import { IChat } from './chat';
import { IUser } from './user';

// 定义消息类型枚举
type MessageType =
  | 'text'
  | 'photo'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'voice'
  | 'video_note'
  | 'animation'
  | 'poll';

type SenderType = 'user' | 'bot';

export interface IMessage extends Document {
  messageId: number; // 消息ID
  bot: IBot | string; // 关联的机器人
  chat: IChat | string; // 关联的聊天
  user?: IUser | string; // 关联的用户（可选）
  sender: SenderType; // 发送者类型
  content: string; // 消息内容
  messageType: MessageType; // 消息类型
  date: Date; // 发送日期
  keywords?: string[]; // 关键词（可选）
  createdAt?: Date; // 创建时间
  updatedAt?: Date; // 更新时间
}

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: Number,
      required: true,
      comment: '消息ID',
    },
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
      comment: '关联的机器人',
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      comment: '关联的聊天',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      comment: '关联的用户',
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
      comment: '发送者类型',
    },
    content: {
      type: String,
      required: true,
      comment: '消息内容',
    },
    messageType: {
      type: String,
      enum: [
        'text',
        'photo',
        'video',
        'audio',
        'document',
        'sticker',
        'location',
        'contact',
        'voice',
        'video_note',
        'animation',
        'poll',
      ],
      required: true,
      comment: '消息类型',
    },
    date: {
      type: Date,
      required: true,
      comment: '发送日期',
    },
    keywords: {
      type: [String],
      required: false,
      comment: '关键词',
    },
  },
  { timestamps: true },
);

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
