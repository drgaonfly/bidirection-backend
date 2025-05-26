import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';

// 只存客户发给机器人的消息（toBot），不存机器人发给客户的消息（fromBot）
export interface IBotMessage extends Document {
  bot: mongoose.Schema.Types.ObjectId; // 关联的机器人
  botUser?: mongoose.Schema.Types.ObjectId | IBotUser; // 发送消息的 BotUser
  messageType: string; // 消息类型，如 text, image, command 等
  content: string; // 消息内容
  raw?: any; // 原始消息体，可选
  group?: mongoose.Schema.Types.ObjectId; // 关联的群（如果是群消息）
  // direction 字段移除，始终为 toBot
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
      enum: ['text', 'image', 'command', 'audio', 'video', 'file', 'other'],
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
    // 不再存 direction 字段
  },
  {
    timestamps: true,
  },
);

const BotMessage = mongoose.model<IBotMessage>('BotMessage', botMessageSchema);

export default BotMessage;
