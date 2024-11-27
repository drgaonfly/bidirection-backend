import { Request, Response } from 'express';
import Lesson from '../models/Lessons';
import handleAsync from '../utils/handleAsync';

// 构建查询条件
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.lessonType) {
    query.lessonType = queryParams.lessonType;
  }

  if (queryParams.language) {
    query.language = queryParams.language;
  }

  // 价格范围查询
  if (queryParams.minPrice || queryParams.maxPrice) {
    query.price = {};
    if (queryParams.minPrice) query.price.$gte = Number(queryParams.minPrice);
    if (queryParams.maxPrice) query.price.$lte = Number(queryParams.maxPrice);
  }

  // 课程时长查询
  if (queryParams.duration) {
    query.duration = Number(queryParams.duration);
  }

  return query;
};

// 获取课程列表
const getLessons = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const lessons = await Lesson.find(query)
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Lesson.countDocuments(query).exec();

  res.json({
    success: true,
    data: lessons,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 创建新课程
const addLesson = handleAsync(async (req: Request, res: Response) => {
  const { lessonType, language, description, price, duration } = req.body;

  try {
    const lesson = await Lesson.create({
      lessonType,
      language,
      description,
      price: Number(price),
      duration: Number(duration),
    });

    res.status(201).json({
      success: true,
      data: lesson,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// 获取单个课程
const getLessonById = handleAsync(async (req: Request, res: Response) => {
  const lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    res.status(404);
    throw new Error('课程不存在');
  }

  res.json({
    success: true,
    data: lesson,
  });
});

// 更新课程
const updateLesson = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      res.status(404);
      throw new Error('课程不存在');
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id,
      {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        duration: req.body.duration ? Number(req.body.duration) : undefined,
      },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: updatedLesson,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// 删除课程
const deleteLesson = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const lesson = await Lesson.findByIdAndDelete(id);

  if (!lesson) {
    res.status(404);
    throw new Error('课程不存在');
  }

  res.json({
    success: true,
    data: { message: '课程删除成功' },
  });
});

// 批量删除课程
const deleteMultipleLessons = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Lesson.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个课程`,
    });
  },
);

export {
  getLessons,
  addLesson,
  getLessonById,
  updateLesson,
  deleteLesson,
  deleteMultipleLessons,
};
