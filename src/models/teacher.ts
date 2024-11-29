import mongoose, { Document } from 'mongoose';

export interface ITeacher extends Document {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: {
    uid: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }; // Avatar
  image?: string;
  status: 'active' | 'inactive';
  lessonCategory: string[]; // Lesson Category
  speaks: string[]; // Language Ability
  teacherType: string; // Teacher Type
  education: string; // Education
  teachingAge: number; // Teaching Age
  title: string; // Title
  certificates?: string[]; // Certificates
  availability?: {
    weekday: boolean[];
    timeSlots: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  level: 'Basic' | 'Intermediate' | 'Advanced'; //语言级别
  employmentType: 'Full-time' | 'Part-time'; // 全职或兼职
  hoursPerWeek?: number; // 每周投入时间
  introduction?: string; // 添加自我介绍字段
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
    avatar: {
      uid: String,
      name: String,
      url: String,
      type: String,
      size: Number,
    },
    image: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    lessonCategory: [
      {
        type: String,
        required: true,
        enum: [
          'Speaking',
          'Writing',
          'Listening',
          'Reading',
          'Spelling',
          'Grammar',
          'Pronunciation',
          'All',
        ],
      },
    ],
    speaks: [
      {
        type: String,
        required: true,
        enum: [
          'Spanish',
          'Japanese',
          'French',
          'English',
          'Chinese (Mandarin)',
        ],
      },
    ],
    teacherType: {
      type: String,
      required: true,
      enum: ['Both', 'Community Tutor', 'Professional Teacher'],
    },
    education: {
      type: String,
      required: true,
      enum: ['Bachelor', 'Master', 'Doctor', 'Other'],
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
        'Teacher',
        'Grade Director',
        'Group Leader',
        'Vice Director',
        'Director',
      ],
    },
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
    level: {
      type: String,
      required: true,
      enum: ['Basic', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    employmentType: {
      type: String,
      required: true,
      enum: ['Full-time', 'Part-time'], // 全职或兼职
      default: 'Part-time',
    },
    hoursPerWeek: {
      type: Number,
      min: 0,
      max: 168, // 每周最多168小时
      default: 0,
    },
    introduction: {
      type: String,
      trim: true,
      maxlength: 1500, // 限制最大长度为 2000 字符
      default: '', // 默认为空字符串
    },
  },
  {
    timestamps: true,
  },
);

// 添加索引以提高查询性能
teacherSchema.index({ email: 1 });
teacherSchema.index({ username: 1 });
teacherSchema.index({ lessonCategory: 1 });
teacherSchema.index({ speaks: 1 });
teacherSchema.index({ teacherType: 1 });
teacherSchema.index({ education: 1 });
teacherSchema.index({ title: 1 });

const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);

export default Teacher;
