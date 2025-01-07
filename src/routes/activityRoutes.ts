import express, { Router } from 'express';
import {
  getActivities,
  addActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  deleteMultipleActivities,
} from '../controllers/activityController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置活动记录的路由
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
