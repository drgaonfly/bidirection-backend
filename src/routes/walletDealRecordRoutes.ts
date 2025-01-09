import express, { Router } from 'express';
import {
  getWalletDealRecords,
  addWalletDealRecord,
  getWalletDealRecordById,
  updateWalletDealRecord,
  deleteWalletDealRecord,
  deleteMultipleWalletDealRecords,
} from '../controllers/walletDealRecordController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置钱包交易记录的路由
router
  .route('/')
  .get(protect, checkPermission, getWalletDealRecords)
  .post(protect, checkPermission, addWalletDealRecord)
  .delete(protect, checkPermission, deleteMultipleWalletDealRecords);

router
  .route('/:id')
  .get(protect, checkPermission, getWalletDealRecordById)
  .put(protect, checkPermission, updateWalletDealRecord)
  .delete(protect, checkPermission, deleteWalletDealRecord);

export default router;
