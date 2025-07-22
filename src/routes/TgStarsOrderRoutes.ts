import express, { Router } from 'express';
import {
  getTgStarsOrderById,
  updateTgStarsOrder,
  deleteTgStarsOrder,
  getTgStarsOrders,
  deleteMultipleTgStarsOrders,
  createTgStarsOrder,
} from '../controllers/tgStarsOrderController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTgStarsOrders)
  .post(protect, checkPermission, createTgStarsOrder)
  .delete(protect, checkPermission, deleteMultipleTgStarsOrders);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteTgStarsOrder)
  .get(protect, checkPermission, getTgStarsOrderById)
  .put(protect, checkPermission, updateTgStarsOrder);

export default router;
