import mongoose, { Document } from 'mongoose';
import { IBotUser } from './botUser';
import { IBot } from './bot';
import { IGroup } from './group';

// 只存客户发给机器人的消息（toBot），不存机器人发给客户的消息（fromBot）
export interface IBotMessage extends Document {
  bot: mongoose.Schema.Types.ObjectId | IBot; // 关联的机器人
  botUser?: mongoose.Schema.Types.ObjectId | IBotUser; // 发送消息的 BotUser
  content: string; // 消息内容
  group?: mongoose.Schema.Types.ObjectId | IGroup; // 关联的群（如果是群消息）
  image: string; // 图片
  intervalTime: number; // 间隔时间
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
    image: {
      type: String,
      required: false,
    },
    content: {
      type: String,
      required: true,
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    intervalTime: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const BotMessage = mongoose.model<IBotMessage>('BotMessage', botMessageSchema);

export default BotMessage;
