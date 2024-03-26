import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  country: string;
  file: string; // 假设这可能是一个URL或文件路径
  uploadedFile: string; // 上传文件路径或URL
  user: Schema.Types.ObjectId; // 对User模型的引用
  orderTime: Date; // 下单时间
  orderNote?: string; // 下单备注，可选字段
  review?: string; // 评价，可选字段
}

const TaskSchema: Schema = new Schema({
  country: { type: String, required: true },
  file: { type: String, required: true },
  uploadedFile: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderTime: { type: Date, required: true },
  orderNote: { type: String, required: false }, // 下单备注
  review: { type: String, required: false }, // 评价
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);