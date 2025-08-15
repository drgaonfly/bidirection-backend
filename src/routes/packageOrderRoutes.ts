import express, { Router } from 'express';
import {
  getPackageOrders,
  getPackageOrderById,
  updatePackageOrder,
  deletePackageOrder,
  deleteMultiplePackageOrders,
} from '../controllers/packageOrderController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 基础CRUD操作
router
  .route('/')
  .get(protect, checkPermission, getPackageOrders)
  .delete(protect, checkPermission, deleteMultiplePackageOrders);

router
  .route('/:id')
  .get(protect, checkPermission, getPackageOrderById)
  .put(protect, checkPermission, updatePackageOrder)
  .delete(protect, checkPermission, deletePackageOrder);

export default router;
