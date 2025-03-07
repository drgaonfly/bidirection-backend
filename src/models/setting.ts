import mongoose, { Document } from 'mongoose';

export interface ISetting extends Document {
  id: string;
  parameter: string; // 设置参数
  key: string; // 设置的 key
  value: string; // 设置的 value
  remark: string; // 备注
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    parameter: { type: String, required: true, trim: true }, // 去除空格
    key: { type: String, unique: true, required: true, trim: true },
    value: { type: String, required: true },
    remark: { type: String, default: '' }, // 默认空字符串
  },
  {
    timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
  },
);

const Setting = mongoose.model<ISetting>('Setting', settingSchema);

export default Setting;

// import mongoose, { Document } from 'mongoose';

// export interface ISetting extends Document {
//   id: string;
//   key: string; // 设置的 key
//   remark: string; // 备注
//   revenuePool: number; // 添加收益池字段
//   incomePool: number; // 添加玩家收入字段
//   StakingApy: number; // 添加质押 apy 字段
//   totalOutput: number; // 总产量
//   validNodes: number; // 有效节点
//   participants: number; // 参加人数
//   userEarnings: number; // 用户收益
//   createdAt: Date;
//   updatedAt: Date;
// }

// const settingSchema = new mongoose.Schema(
//   {
//     id: { type: String },
//     key: { type: String, unique: true, trim: true },
//     remark: { type: String, default: '' }, // 默认空字符串
//     revenuePool: { type: Number }, // 设置默认值
//     incomePool: { type: Number }, // 设置默认值
//     StakingApy: { type: Number }, // 设置默认值

//     totalOutput: { type: Number }, // 总产量
//     validNodes: { type: Number }, // 有效节点
//     participants: { type: Number }, // 参加人数
//     userEarnings: { type: Number }, // 用户收益
//   },
//   {
//     timestamps: true, // 自动生成 createdAt 和 updatedAt 字段
//   },
// );

// const Setting = mongoose.model<ISetting>('Setting', settingSchema);

// export default Setting;
