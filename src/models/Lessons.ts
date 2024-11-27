import mongoose, { Document } from 'mongoose';

export interface ILesson extends Document {
  _id: string;
  //   teacher: string;          // 关联教师ID
  lessonType: string; // 课程类型
  language: string; // 教学语言
  description: string; // 课程描述
  price: number; // 课程价格
  duration: number; // 课程时长（分钟）
  comments?: {
    // 评论
    user: string; // 评论用户ID
    content: string; // 评论内容
    rating: number; // 评分 1-5
    createdAt: Date; // 评论时间
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new mongoose.Schema(
  {
    // teacher: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Teacher',
    //   required: true,
    // },
    lessonType: {
      type: String,
      required: true,
      enum: [
        'Trial Lesson', // 试听课
        'Conversational English', // 会话英语
        'Business English', // 商务英语
        'Meeting Preparation', // 会议准备
        'Presentation Skills', // 演讲准备
        'Job Application', // 工作申请
        'Interview Preparation', // 面试准备
        'Reading and Discussion', // 指导阅读和讨论
      ],
    },
    language: {
      type: String,
      required: true,
      enum: ['English', 'Chinese (Mandarin)', 'Japanese', 'French', 'Spanish'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      enum: [30, 45, 60, 90, 120], // 常见课程时长
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// 添加索引以提高查询性能
lessonSchema.index({ teacher: 1 });
lessonSchema.index({ lessonType: 1 });
lessonSchema.index({ language: 1 });
lessonSchema.index({ price: 1 });
lessonSchema.index({ 'comments.rating': 1 });

const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);

export default Lesson;
