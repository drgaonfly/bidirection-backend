import express, { Router } from 'express';
import {
  getRevenueShares,
  getRevenueShareById,
  addRevenueShare,
  updateRevenueShare,
  deleteRevenueShare,
  deleteMultipleRevenueShares,
} from '../controllers/revenueShareController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getRevenueShares)
  .post(protect, checkPermission, addRevenueShare)
  .delete(protect, checkPermission, deleteMultipleRevenueShares);

router
  .route('/:id')
  .get(protect, checkPermission, getRevenueShareById)
  .put(protect, checkPermission, updateRevenueShare)
  .delete(protect, checkPermission, deleteRevenueShare);

export default router;
