import express, { Router } from 'express';
import {
  getStarById,
  updateStar,
  deleteStar,
  getStars,
  deleteMultipleStars,
  createStar,
} from '../controllers/starController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getStars)
  .post(protect, checkPermission, createStar)
  .delete(protect, checkPermission, deleteMultipleStars);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteStar)
  .get(protect, checkPermission, getStarById)
  .put(protect, checkPermission, updateStar);

export default router;
