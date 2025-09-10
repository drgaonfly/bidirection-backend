import express, { Router } from 'express';
import {
  getTronBalances,
  getTronBalanceById,
  addTronBalance,
  updateTronBalance,
  deleteTronBalance,
  deleteMultipleTronBalances,
} from '../controllers/tronBalanceController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTronBalances)
  .post(protect, checkPermission, addTronBalance)
  .delete(protect, checkPermission, deleteMultipleTronBalances);

router
  .route('/:id')
  .get(protect, checkPermission, getTronBalanceById)
  .put(protect, checkPermission, updateTronBalance)
  .delete(protect, checkPermission, deleteTronBalance);

export default router;
