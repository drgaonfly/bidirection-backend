import { Request, Response } from 'express';
import Translate from '../models/translate';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.translate) {
    query.translate = { $regex: new RegExp(queryParams.translate, 'i') };
  }

  return query;
};

// 获取所有翻译记录
const getTranslates = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const translates = await Translate.find(query)
    .populate('langue')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Translate.countDocuments(query).exec();

  res.json({
    success: true,
    data: translates,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 添加翻译记录
const addTranslate = handleAsync(async (req: Request, res: Response) => {
  const newTranslate = new Translate({
    ...req.body,
  });

  const savedTranslate = await newTranslate.save();
  res.json({
    success: true,
    data: savedTranslate,
  });
});

// 根据 ID 获取翻译记录
const getTranslateById = handleAsync(async (req: Request, res: Response) => {
  const translate = await Translate.findById(req.params.id).populate('langue');

  res.json({
    success: true,
    data: translate,
  });
});

// 更新翻译记录
const updateTranslate = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedTranslate = await Translate.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedTranslate,
  });
});

// 删除翻译记录
const deleteTranslate = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const translate = await Translate.findByIdAndDelete(id);

  res.json({
    success: true,
    message: translate,
  });
});

// 批量删除翻译记录
const deleteMultipleTranslates = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Translate.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} translates deleted successfully`,
    });
  },
);

export {
  getTranslates,
  addTranslate,
  getTranslateById,
  updateTranslate,
  deleteTranslate,
  deleteMultipleTranslates,
};
