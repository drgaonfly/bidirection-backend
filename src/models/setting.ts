import mongoose, { Document } from 'mongoose';

export interface ISetting extends Document {
  id: string;
  parameter: string; // 设置参数
  key: string; // 设置的 key
  value: string; // 设置的 value
  isVisible: boolean; // 是否可见
  remark: string; // 备注
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    parameter: {
      type: String,
      required: true,
      trim: true, // 去除空格
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
    isVisible: {
      type: Boolean,
      required: true,
      default: true, // 默认可见
    },
    remark: {
      type: String,
      default: '', // 默认空字符串
    },
  },
  {
    timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
  },
);

const Setting = mongoose.model<ISetting>('Setting', settingSchema);

export default Setting;
