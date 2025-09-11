import express, { Router } from 'express';
import {
  getTgStarById,
  updateTgStar,
  deleteTgStar,
  getTgStars,
  deleteMultipleTgStars,
  createTgStar,
} from '../controllers/tgStarController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTgStars)
  .post(protect, checkPermission, createTgStar)
  .delete(protect, checkPermission, deleteMultipleTgStars);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteTgStar)
  .get(protect, checkPermission, getTgStarById)
  .put(protect, checkPermission, updateTgStar);

export default router;
