import { Request, Response } from 'express';
import Activity from '../models/Activity';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.customerId) {
    query.customerId = queryParams.customerId;
  }

  if (queryParams.activityId) {
    query.activityId = queryParams.activityId;
  }

  if (queryParams.activityType) {
    query.activityType = { $regex: new RegExp(queryParams.activityType, 'i') };
  }

  return query;
};

// 获取所有活动记录
const getActivities = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const activities = await Activity.find(query)
    .populate('customer')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Activity.countDocuments(query).exec();

  res.json({
    success: true,
    data: activities,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 添加活动记录
const addActivity = handleAsync(async (req: Request, res: Response) => {
  const newActivity = new Activity({
    ...req.body,
  });

  const savedActivity = await newActivity.save();
  res.json({
    success: true,
    data: savedActivity,
  });
});

// 根据 ID 获取活动记录
const getActivityById = handleAsync(async (req: Request, res: Response) => {
  const activity = await Activity.findById(req.params.id);

  res.json({
    success: true,
    data: activity,
  });
});

// 更新活动记录
const updateActivity = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedActivity = await Activity.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedActivity,
  });
});

// 删除活动记录
const deleteActivity = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const activity = await Activity.findByIdAndDelete(id);

  res.json({
    success: true,
    message: activity,
  });
});

// 批量删除活动记录
const deleteMultipleActivities = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Activity.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} activities deleted successfully`,
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleActivities,
  updateActivity,
  deleteActivity,
  getActivities,
  addActivity,
  getActivityById,
};
