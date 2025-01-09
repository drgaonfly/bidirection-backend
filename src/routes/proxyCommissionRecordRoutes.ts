import express, { Router } from 'express';
import {
  getProxyCommissionRecords,
  addProxyCommissionRecord,
  getProxyCommissionRecordById,
  updateProxyCommissionRecord,
  deleteProxyCommissionRecord,
  deleteMultipleProxyCommissionRecords,
} from '../controllers/proxyCommissionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置代理佣金记录的路由
router
  .route('/')
  .get(protect, checkPermission, getProxyCommissionRecords)
  .post(protect, checkPermission, addProxyCommissionRecord)
  .delete(protect, checkPermission, deleteMultipleProxyCommissionRecords);

router
  .route('/:id')
  .get(protect, checkPermission, getProxyCommissionRecordById)
  .put(protect, checkPermission, updateProxyCommissionRecord)
  .delete(protect, checkPermission, deleteProxyCommissionRecord);

export default router;
