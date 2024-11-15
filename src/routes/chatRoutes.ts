import express, { Router } from 'express';
import {
  getChats,
  getChatById,
  addChat,
  updateChat,
  deleteChat,
  deleteMultipleChats,
} from '../controllers/chatController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取所有聊天、添加新聊天和批量删除聊天
router
  .route('/')
  .get(protect, checkPermission, getChats)
  .post(protect, checkPermission, addChat)
  .delete(protect, checkPermission, deleteMultipleChats);

// 根据 ID 获取、更新和删除聊天
router
  .route('/:id')
  .get(protect, checkPermission, getChatById)
  .put(protect, checkPermission, updateChat)
  .delete(protect, checkPermission, deleteChat);

export default router;
