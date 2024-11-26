import express, { Router } from 'express';
import {
  getTeachers,
  getTeacherById,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  deleteMultipleTeachers,
} from '../controllers/teacherController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 批量路由处理
router
  .route('/')
  .get(protect, checkPermission, getTeachers) // 获取教师列表
  .post(protect, checkPermission, addTeacher) // 添加新教师
  .delete(protect, checkPermission, deleteMultipleTeachers); // 批量删除教师

// 单个教师路由处理
router
  .route('/:id')
  .get(protect, checkPermission, getTeacherById) // 获取单个教师
  .put(protect, checkPermission, updateTeacher) // 更新教师
  .delete(protect, checkPermission, deleteTeacher); // 删除教师

export default router;
