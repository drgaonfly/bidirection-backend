import mongoose, { Document } from 'mongoose';

export interface IPackage extends Document {
  id: string;
  name: string; // 名称
  expenditure: number; // 花费多少 (trx)
  aqusition: number; // 得到多少能量(sun)
  expiration: number; // 有效时间 (hour)
  commission: number; // 分佣
  times: number; // 笔数
  type: string; // 类型
  min_expenditure: number; // 最低消费
}

const packageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, //id
    name: { type: String, required: false }, // 名称
    expenditure: { type: Number, required: true }, // 花费多少 (trx)
    aqusition: { type: Number, required: true, default: 65000 }, // 得到多少能量(sun)
    expiration: { type: Number, required: true }, // 有效时间 (hour)
    commission: { type: Number, required: true }, // 分佣
    times: { type: Number, required: true }, // 笔数
    type: { type: String, enum: ['hourly', 'daily'] }, // 闪租 hourly, 日租 daily
    min_expenditure: { type: Number, required: true }, // 最低消费
  },
  {
    timestamps: true,
  },
);

const Package = mongoose.model<IPackage>('Package', packageSchema);

export default Package;
