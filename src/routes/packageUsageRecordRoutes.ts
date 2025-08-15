import express, { Router } from 'express';
import {
  getPackageUsageRecords,
  getPackageUsageRecordById,
  deletePackageUsageRecord,
  deleteMultiplePackageUsageRecords,
} from '../controllers/packageUsageRecordController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 基础操作
router
  .route('/')
  .get(protect, checkPermission, getPackageUsageRecords)
  .delete(protect, checkPermission, deleteMultiplePackageUsageRecords);

// 单个记录操作
router
  .route('/:id')
  .get(protect, checkPermission, getPackageUsageRecordById)
  .delete(protect, checkPermission, deletePackageUsageRecord);

export default router;
