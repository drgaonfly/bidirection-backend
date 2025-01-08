import mongoose, { Document } from 'mongoose';

export interface IInstruction extends Document {
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const instructionSchema = new mongoose.Schema(
  {
    title: { type: String, required: false },
    content: { type: String, required: false },
  },
  { timestamps: true },
);

// 添加检查以防止模型重复定义
export default mongoose.models.Instruction ||
  mongoose.model<IInstruction>('Instruction', instructionSchema);
