import express, { Router } from 'express';
import {
  getDeductions,
  getDeductionById,
  addDeduction,
  updateDeduction,
  deleteDeduction,
  deleteMultipleDeductions,
} from '../controllers/deductionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getDeductions)
  .post(protect, checkPermission, addDeduction)
  .delete(protect, checkPermission, deleteMultipleDeductions);

router
  .route('/:id')
  .get(protect, checkPermission, getDeductionById)
  .put(protect, checkPermission, updateDeduction)
  .delete(protect, checkPermission, deleteDeduction);

export default router;
