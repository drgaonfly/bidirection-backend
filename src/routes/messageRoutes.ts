import express, { Router } from 'express';
import {
  getMessages,
  getMessageById,
  addMessage,
  updateMessage,
  deleteMessage,
  deleteMultipleMessages,
} from '../controllers/messageController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取所有消息、添加新消息和批量删除消息
router
  .route('/')
  .get(protect, checkPermission, getMessages)
  .post(protect, checkPermission, addMessage)
  .delete(protect, checkPermission, deleteMultipleMessages);

// 根据 ID 获取、更新和删除消息
router
  .route('/:id')
  .get(protect, checkPermission, getMessageById)
  .put(protect, checkPermission, updateMessage)
  .delete(protect, checkPermission, deleteMessage);

export default router;
