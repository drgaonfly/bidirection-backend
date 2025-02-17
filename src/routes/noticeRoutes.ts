import express, { Router } from 'express';
import {
  getNotices,
  addNotice,
  getNoticeById,
  updateNotice,
  deleteNotice,
  deleteMultipleNotices,
} from '../controllers/noticeController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置通知的路由
router
  .route('/')
  .get(getNotices)
  .post(protect, checkPermission, addNotice)
  .delete(protect, checkPermission, deleteMultipleNotices);

router
  .route('/:id')
  .get(protect, checkPermission, getNoticeById)
  .put(protect, checkPermission, updateNotice)
  .delete(protect, checkPermission, deleteNotice);

export default router;
