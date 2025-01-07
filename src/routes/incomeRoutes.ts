import express, { Router } from 'express';
import {
  getIncomes,
  addIncome,
  getIncomeById,
  updateIncome,
  deleteIncome,
  deleteMultipleIncomes,
} from '../controllers/incomeController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置收入记录的路由
router
  .route('/')
  .get(protect, checkPermission, getIncomes)
  .post(protect, checkPermission, addIncome)
  .delete(protect, checkPermission, deleteMultipleIncomes);

router
  .route('/:id')
  .get(protect, checkPermission, getIncomeById)
  .put(protect, checkPermission, updateIncome)
  .delete(protect, checkPermission, deleteIncome);

export default router;
