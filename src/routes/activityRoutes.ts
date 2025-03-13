import express, { Router } from 'express';
import {
  getActivities,
  addActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  deleteMultipleActivities,
  getPendingActivityByAddress,
  updateActivityAndCreateRelease,
} from '../controllers/activityController';
import { protect, checkPermission } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取未参与的活动
router.route('/pending').get(customerProtect, getPendingActivityByAddress);

// 点击接受更新活动状态并创建解押记录
router
  .route('/update-and-release')
  .post(customerProtect, updateActivityAndCreateRelease);

router
  .route('/')
  .get(protect, checkPermission, getActivities)
  .post(protect, checkPermission, addActivity)
  .delete(protect, checkPermission, deleteMultipleActivities);

router
  .route('/:id')
  .get(protect, checkPermission, getActivityById)
  .put(protect, checkPermission, updateActivity)
  .delete(protect, checkPermission, deleteActivity);

export default router;
