import express, { Router } from 'express';
import {
  getChatById,
  updateChat,
  deleteChat,
  getChats,
  deleteMultipleChats,
  addChat,
  getChatMessages,
  addChatMessage,
} from '../controllers/chatController';
import {
  protect,
  checkPermission,
  customerProtect,
} from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getChats)
  .delete(protect, checkPermission, deleteMultipleChats)
  .post(protect, checkPermission, addChat);

router
  .route('/messages')
  .get(customerProtect, getChatMessages)
  .post(customerProtect, addChatMessage);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteChat)
  .get(protect, checkPermission, getChatById)
  .put(protect, checkPermission, updateChat);

export default router;
