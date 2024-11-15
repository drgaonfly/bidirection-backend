import mongoose, { Document, Schema } from 'mongoose';
import { IBot } from './bot';

// 定义日志级别类型
type LogLevel = 'info' | 'warning' | 'error';

export interface ILog extends Document {
  bot?: IBot | string; // 关联的机器人（可选）
  level: LogLevel; // 日志级别
  message: string; // 日志消息
  timestamp: Date; // 时间戳
}

const logSchema = new mongoose.Schema(
  {
    bot: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: false,
      comment: '关联的机器人',
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error'],
      required: true,
      comment: '日志级别',
    },
    message: {
      type: String,
      required: true,
      comment: '日志消息',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      comment: '时间戳',
    },
  },
  { timestamps: false }, // 禁用自动时间戳，因为我们使用自定义的 timestamp
);

// 添加索引以提高查询性能
logSchema.index({ timestamp: -1 }); // 按时间戳降序索引
logSchema.index({ level: 1 }); // 按日志级别索引
logSchema.index({ bot: 1 }); // 按机器人ID索引

const Log = mongoose.model<ILog>('Log', logSchema);

export default Log;
