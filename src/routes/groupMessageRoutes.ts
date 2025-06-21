import express, { Router } from 'express';
import {
  getGroupMessages,
  getGroupMessageById,
  addGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  deleteMultipleGroupMessages,
} from '../controllers/groupMessageController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getGroupMessages)
  .post(protect, checkPermission, addGroupMessage)
  .delete(protect, checkPermission, deleteMultipleGroupMessages);

router
  .route('/:id')
  .get(protect, checkPermission, getGroupMessageById)
  .put(protect, checkPermission, updateGroupMessage)
  .delete(protect, checkPermission, deleteGroupMessage);

export default router;
