import express, { Router } from 'express';
import {
  getWithdraws,
  getWithdrawById,
  updateWithdraw,
  deleteWithdraw,
  deleteMultipleWithdraws,
  addWithdraw,
  approveWithdraw,
  rejectWithdraw,
} from '../controllers/withdrawController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id/approve').put(protect, checkPermission, approveWithdraw);
router.route('/:id/reject').put(protect, checkPermission, rejectWithdraw);

router
  .route('/')
  .get(protect, checkPermission, getWithdraws)
  .delete(protect, checkPermission, deleteMultipleWithdraws)
  .post(protect, checkPermission, addWithdraw);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteWithdraw)
  .get(protect, checkPermission, getWithdrawById)
  .put(protect, checkPermission, updateWithdraw);

export default router;
