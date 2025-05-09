import mongoose, { Document } from 'mongoose';
import { IBot } from './bot';

// 群组接口定义
export interface IGroup extends Document {
  id: number;
  title: string;
  type: string;
  bot: mongoose.Schema.Types.ObjectId | IBot;
  exchange_rate?: number;
  fee_rate?: number;
}

// 群组 Schema
const groupSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['group'],
      default: 'group',
    },
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
    },
    exchange_rate: {
      type: Number,
      required: false,
      default: 1, // USDT默认汇率为1
    },
    fee_rate: {
      type: Number,
      required: false,
      default: 0, // 默认费率为0%
    },
  },
  {
    timestamps: true,
  },
);

const Group = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
