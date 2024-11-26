import { Request, Response } from 'express';
import Teacher from '../models/teacher';
import handleAsync from '../utils/handleAsync';

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

  const total = await Teacher.countDocuments(query).exec();

  res.json({
    success: true,
    data: teachers,
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
    subject,
    education,
    teachingAge,
    title,
    speciality,
  } = req.body;

  try {
    // 检查邮箱是否已存在
    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
      res.status(400);
      throw new Error('该邮箱已被注册，请使用其他邮箱');
    }

    // 检查用户名是否已存在
    const usernameExists = await Teacher.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('该用户名已被使用，请选择其他用户名');
    }

    const teacher = await Teacher.create({
      username,
      email: email.toLowerCase(),
      phone,
      address,
      status: status || 'active',
      subject,
      education,
      teachingAge,
      title,
      speciality,
      availability: {
        weekday: new Array(7).fill(false),
        timeSlots: [],
      },
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
          ? '该邮箱已被注册，请使用其他邮箱'
          : '该用户名已被使用，请选择其他用户名';

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

  res.json({
    success: true,
    data: teacher,
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
