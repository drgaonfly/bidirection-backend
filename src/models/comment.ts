import mongoose, { Document } from 'mongoose';

export interface IComment extends Document {
  _id: string;
  customer: mongoose.Types.ObjectId; // 只关联客户
  content: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer', // 关联到 Customer 模型
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

// 添加索引
commentSchema.index({ customer: 1 });
commentSchema.index({ rating: 1 });
commentSchema.index({ createdAt: 1 });

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
