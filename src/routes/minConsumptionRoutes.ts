import express, { Router } from 'express';
import {
  getMinConsumptions,
  getMinConsumptionById,
  updateMinConsumption,
  deleteMinConsumption,
  deleteMultipleMinConsumptions,
} from '../controllers/minConsumptionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 基础CRUD操作
router
  .route('/')
  .get(protect, checkPermission, getMinConsumptions)
  .delete(protect, checkPermission, deleteMultipleMinConsumptions);

router
  .route('/:id')
  .get(protect, checkPermission, getMinConsumptionById)
  .put(protect, checkPermission, updateMinConsumption)
  .delete(protect, checkPermission, deleteMinConsumption);

export default router;
