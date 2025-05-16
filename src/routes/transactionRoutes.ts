import express, { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  deleteMultipleTransactions,
  getSummary,
  getTransactionByDate,
  exportToExcel,
  getAllTransactions,
} from '../controllers/transactionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 前端获取
router.get('/f/all', getTransactionByDate);

router.get('/f/summary', getSummary);

router.get('/f/export', exportToExcel);

router
  .route('/')
  .get(protect, checkPermission, getTransactions)
  .post(protect, checkPermission, addTransaction)
  .delete(protect, checkPermission, deleteMultipleTransactions);

router.route('/all').get(protect, checkPermission, getAllTransactions);

router
  .route('/:id')
  .get(protect, checkPermission, getTransactionById)
  .put(protect, checkPermission, updateTransaction)
  .delete(protect, checkPermission, deleteTransaction);

export default router;
