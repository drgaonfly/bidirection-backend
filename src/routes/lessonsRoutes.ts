import express, { Router } from 'express';
import {
  getLessons,
  getLessonById,
  addLesson,
  updateLesson,
  deleteLesson,
  deleteMultipleLessons,
  //   addComment,
} from '../controllers/lessonsController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 批量路由处理
router
  .route('/')
  .get(protect, checkPermission, getLessons) // 获取课程列表
  .post(protect, checkPermission, addLesson) // 添加新课程
  .delete(protect, checkPermission, deleteMultipleLessons); // 批量删除课程

// 单个课程路由处理
router
  .route('/:id')
  .get(protect, checkPermission, getLessonById) // 获取单个课程
  .put(protect, checkPermission, updateLesson) // 更新课程
  .delete(protect, checkPermission, deleteLesson); // 删除课程

// 评论路由
router;
//   .route('/:id/comments')
//   .post(protect, checkPermission, addComment);         // 添加课程评论

export default router;
