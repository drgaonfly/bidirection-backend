import mongoose, { Document } from 'mongoose';

export interface ITeacher extends Document {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  // 教师特有字段
  subject: string[]; // 教授科目
  education: string; // 学历
  teachingAge: number; // 教龄
  title: string; // 职称
  speciality: string[]; // 专长/特长
  //   introduction?: string;     // 个人简介
  certificates?: string[]; // 证书
  availability?: {
    // 可授课时间
    weekday: boolean[]; // 周一到周日的可用性
    timeSlots: string[]; // 具体时间段
  };
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // 教师特有字段
    subject: [
      {
        type: String,
        required: true,
      },
    ],
    education: {
      type: String,
      required: true,
      enum: ['bachelor', 'master', 'doctor', 'other'],
    },
    teachingAge: {
      type: Number,
      required: true,
      min: 0,
    },
    title: {
      type: String,
      required: true,
      enum: [
        'teacher',
        'gradeDirector',
        'groupLeader',
        'viceDirector',
        'director',
      ],
    },
    speciality: [
      {
        type: String,
        required: true,
      },
    ],
    certificates: [
      {
        type: String,
      },
    ],
    availability: {
      weekday: [
        {
          type: Boolean,
          default: false,
        },
      ],
      timeSlots: [
        {
          type: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

// 添加索引以提高查询性能
teacherSchema.index({ email: 1 });
teacherSchema.index({ username: 1 });
teacherSchema.index({ subject: 1 });
teacherSchema.index({ education: 1 });
teacherSchema.index({ title: 1 });

const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);

export default Teacher;
