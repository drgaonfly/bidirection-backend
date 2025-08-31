import mongoose, { Document } from 'mongoose';

export interface IPackage extends Document {
  id: string;
  name: string; // 名称
  expenditure: number; // 花费多少 (trx)
  expiration: number; // 有效时间 (hour)
  times: number; // 笔数
  type: string; // 类型
}

const packageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, //id
    name: { type: String, required: false }, // 名称
    expenditure: { type: Number, required: true }, // 花费多少 (trx)
    expiration: { type: Number, required: true }, // 有效时间 (hour)
    times: { type: Number, required: true }, // 笔数
    type: { type: String, enum: ['hourly', 'daily'] }, // 闪租 hourly, 日租 daily
  },
  {
    timestamps: true,
  },
);

const Package = mongoose.model<IPackage>('Package', packageSchema);

export default Package;
