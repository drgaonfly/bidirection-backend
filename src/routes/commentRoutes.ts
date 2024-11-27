import express, { Router } from 'express';
import {
  getComments,
  getCommentById,
  addComment,
  updateComment,
  deleteComment,
  deleteMultipleComments,
} from '../controllers/commentController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 批量路由处理
router
  .route('/')
  .get(protect, checkPermission, getComments) // 获取评论列表
  .post(protect, checkPermission, addComment) // 添加新评论
  .delete(protect, checkPermission, deleteMultipleComments); // 批量删除评论

// 单个评论路由处理
router
  .route('/:id')
  .get(protect, checkPermission, getCommentById) // 获取单个评论
  .put(protect, checkPermission, updateComment) // 更新评论
  .delete(protect, checkPermission, deleteComment); // 删除评论

export default router;
