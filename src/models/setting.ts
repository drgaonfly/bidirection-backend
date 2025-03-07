import mongoose, { Document } from 'mongoose';

export interface ISetting extends Document {
  id: string;
  key: string; // 设置的 key
  remark: string; // 备注
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new mongoose.Schema(
  {
    id: { type: String },
    key: { type: String, unique: true, trim: true },
    remark: { type: String, default: '' }, // 默认空字符串
    revenuePool: { type: Number }, //收益池
    incomePool: { type: Number }, // 玩家收入
    StakingApy: { type: Number }, // 质押 apy
  },
  {
    timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
  },
);

const Setting = mongoose.model<ISetting>('Setting', settingSchema);

export default Setting;
