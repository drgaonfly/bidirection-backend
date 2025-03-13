import express, { Router } from 'express';
import {
  getVideos,
  addVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  deleteMultipleVideos,
} from '../controllers/videoController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(getVideos)
  .post(protect, checkPermission, addVideo)
  .delete(protect, checkPermission, deleteMultipleVideos);

router
  .route('/:id')
  .get(getVideoById)
  .put(protect, checkPermission, updateVideo)
  .delete(protect, checkPermission, deleteVideo);

export default router;
