import { Request, Response } from 'express';
import Langue from '../models/langue';
import handleAsync from '../utils/handleAsync';
import {
  transformDocumentImage,
  transformDocumentImages,
} from '../utils/transformUtils';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.name) {
    query.name = queryParams.name;
  }
  if (queryParams.code) {
    query.code = queryParams.code;
  }

  return query;
};

// Get all languages
const getLangues = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const langues = await Langue.find(query)
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  // 处理图片路径
  const processedLangues = await transformDocumentImages(langues, ['image']);

  const total = await Langue.countDocuments(query).exec();

  res.json({
    success: true,
    data: processedLangues,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// Add new language
const addLangue = handleAsync(async (req: Request, res: Response) => {
  const newLangue = new Langue({
    ...req.body,
  });

  const savedLangue = await newLangue.save();

  res.json({
    success: true,
    data: savedLangue,
  });
});

// Get language by ID
const getLangueById = handleAsync(async (req: Request, res: Response) => {
  const langue = await Langue.findById(req.params.id);

  if (!langue) {
    res.status(404);
    throw new Error('Language not found');
  }

  // 处理图片路径
  const processedLangue = await transformDocumentImage(langue, ['image']);

  res.json({
    success: true,
    data: processedLangue,
  });
});

// 更新答案
const updateLangue = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { image, ...otherFields } = req.body;

  const langue = await Langue.findById(id);
  if (!langue) {
    res.status(404);
    throw new Error('答案不存在');
  }

  // 更新字段
  const updates = {
    ...(image && !image.startsWith('http') && { image }),
    ...otherFields,
  };

  const updatedLangue = await Langue.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  // 处理图片路径
  const processedLangue = await transformDocumentImage(updatedLangue, [
    'image',
  ]);

  res.json({
    success: true,
    data: processedLangue,
  });
});

// Delete language
const deleteLangue = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const langue = await Langue.findByIdAndDelete(id);

  if (!langue) {
    res.status(404);
    throw new Error('Language not found');
  }

  res.json({
    success: true,
    data: { message: 'Language deleted successfully' },
  });
});

// Delete multiple languages
const deleteMultipleLangues = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Langue.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} languages deleted successfully`,
    });
  },
);

export {
  getLangues,
  addLangue,
  getLangueById,
  updateLangue,
  deleteLangue,
  deleteMultipleLangues,
};
