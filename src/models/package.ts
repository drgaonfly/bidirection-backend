import mongoose, { Document } from 'mongoose';

export interface IPackage extends Document {
  id: string;
  expenditure: number; // 花费多少 (trx)
  aqusition: number; // 得到多少能量(sun)
  expiration: number; // 有效时间 (hour)
  commission: number; // 分佣
  times: number; // 笔数
  type: string; // 类型
}

const packageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, //id
    expenditure: { type: Number, required: true }, // 花费多少 (trx)
    aqusition: { type: Number, required: true }, // 得到多少能量(sun)
    expiration: { type: Number, required: true }, // 有效时间 (hour)
    commission: { type: Number, required: true }, // 分佣
    times: { type: Number, required: true }, // 笔数
    type: { type: String, enum: ['hourly', 'daily'] }, // 闪租 hourly, 日租 daily
  },
  {
    timestamps: true,
  },
);

const Package = mongoose.model<IPackage>('Package', packageSchema);

export default Package;
