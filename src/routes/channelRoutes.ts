import express, { Router } from 'express';
import {
  getChannels,
  addChannel,
  getChannelById,
  updateChannel,
  deleteChannel,
  deleteMultipleChannels,
} from '../controllers/channelController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置频道记录的路由
router
  .route('/')
  .get(protect, checkPermission, getChannels)
  .post(protect, checkPermission, addChannel)
  .delete(protect, checkPermission, deleteMultipleChannels);

router
  .route('/:id')
  .get(protect, checkPermission, getChannelById)
  .put(protect, checkPermission, updateChannel)
  .delete(protect, checkPermission, deleteChannel);

export default router;
