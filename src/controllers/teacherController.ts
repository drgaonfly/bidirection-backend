import { Request, Response } from 'express';
import Teacher from '../models/teacher';
import handleAsync from '../utils/handleAsync';
import {
  transformDocumentImages,
  transformDocumentImage,
} from '../utils/transformUtils';

// 构建查询条件
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.username) {
    query.username = queryParams.username;
  }

  if (queryParams.email) {
    query.email = { $regex: queryParams.email, $options: 'i' };
  }

  if (queryParams.phone) {
    query.phone = { $regex: queryParams.phone, $options: 'i' };
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  // 教师特有的查询条件
  if (queryParams.subject) {
    query.subject = {
      $in: Array.isArray(queryParams.subject)
        ? queryParams.subject
        : [queryParams.subject],
    };
  }

  if (queryParams.education) {
    query.education = queryParams.education;
  }

  if (queryParams.title) {
    query.title = queryParams.title;
  }

  if (queryParams.teachingAge) {
    query.teachingAge = queryParams.teachingAge;
  }

  // 新增查询条件
  if (queryParams.lessonCategory) {
    query.lessonCategory = {
      $in: Array.isArray(queryParams.lessonCategory)
        ? queryParams.lessonCategory
        : [queryParams.lessonCategory],
    };
  }

  if (queryParams.speaks) {
    query.speaks = {
      $in: Array.isArray(queryParams.speaks)
        ? queryParams.speaks
        : [queryParams.speaks],
    };
  }

  if (queryParams.teacherType) {
    query.teacherType = queryParams.teacherType;
  }

  // 添加新的查询条件
  if (queryParams.employmentType) {
    query.employmentType = queryParams.employmentType;
  }

  if (queryParams.hoursPerWeek) {
    query.hoursPerWeek = queryParams.hoursPerWeek;
  }

  return query;
};

// 获取教师列表
const getTeachers = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const teachers = await Teacher.find(query)
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  // 处理图片路径
  const processedTeachers = await transformDocumentImages(teachers, [
    'avatar',
    'image',
  ]);

  const total = await Teacher.countDocuments(query).exec();

  res.json({
    success: true,
    data: processedTeachers,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 创建新教师
const addTeacher = handleAsync(async (req: Request, res: Response) => {
  const {
    username,
    email,
    phone,
    address,
    status,
    avatar,
    image,
    lessonCategory,
    speaks,
    teacherType,
    education,
    teachingAge,
    title,
    certificates,
    availability,
    employmentType,
    hoursPerWeek,
    introduction,
  } = req.body;
  try {
    // 检查邮箱是否已存在
    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
      res.status(400);
      throw new Error('Email already registered');
    }

    // 检查用户名是否已存在
    const usernameExists = await Teacher.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('Username already taken');
    }

    const teacher = await Teacher.create({
      username,
      email: email?.toLowerCase(),
      phone,
      address,
      status: status || 'active',
      avatar,
      image,
      lessonCategory,
      speaks,
      teacherType,
      education,
      teachingAge,
      title,
      certificates,
      availability: availability || {
        weekday: new Array(7).fill(false),
        timeSlots: [],
      },
      employmentType: employmentType || 'Part-time',
      hoursPerWeek: hoursPerWeek || 0,
      introduction: introduction || '',
    });

    res.status(201).json({
      success: true,
      data: teacher,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === 'email'
          ? 'Email already registered'
          : 'Username already taken';

      res.status(400).json({
        success: false,
        message: message,
      });
    } else {
      throw error;
    }
  }
});

// 获取单个教师
const getTeacherById = handleAsync(async (req: Request, res: Response) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    res.status(404);
    throw new Error('教师不存在');
  }

  // 处理图片路径
  const processedTeacher = await transformDocumentImage(teacher, [
    'avatar',
    'image',
  ]);

  res.json({
    success: true,
    data: processedTeacher,
  });
});

// 更新教师
const updateTeacher = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, username } = req.body;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      res.status(404);
      throw new Error('教师不存在');
    }

    // 检查邮箱唯一性
    if (email && email !== teacher.email) {
      const emailExists = await Teacher.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        res.status(400);
        throw new Error('该邮箱已被其他用户使用');
      }
    }

    // 检查用户名唯一性
    if (username && username !== teacher.username) {
      const usernameExists = await Teacher.findOne({
        username,
        _id: { $ne: id },
      });
      if (usernameExists) {
        res.status(400);
        throw new Error('该用户名已被其他用户使用');
      }
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      {
        ...req.body,
        email: email?.toLowerCase(),
      },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: updatedTeacher,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === 'email'
          ? '该邮箱已被其他用户使用'
          : '该用户名已被其他用户使用';

      res.status(400).json({
        success: false,
        message: message,
      });
    } else {
      throw error;
    }
  }
});

// 删除教师
const deleteTeacher = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const teacher = await Teacher.findByIdAndDelete(id);

  if (!teacher) {
    res.status(404);
    throw new Error('教师不存在');
  }

  res.json({
    success: true,
    data: { message: '教师删除成功' },
  });
});

// 批量删除教师
const deleteMultipleTeachers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Teacher.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个教师`,
    });
  },
);

export {
  getTeachers,
  addTeacher,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  deleteMultipleTeachers,
};
