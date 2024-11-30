import express, { Router } from 'express';
import {
  getWithdrawals,
  getWithdrawalById,
  createWithdrawal,
  updateWithdrawalStatus,
  deleteWithdrawal,
  deleteMultipleWithdrawals,
} from '../controllers/withdrawalController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 批量路由处理
router
  .route('/')
  .get(protect, checkPermission, getWithdrawals) // 获取提款申请列表
  .post(protect, checkPermission, createWithdrawal) // 创建提款申请
  .delete(protect, checkPermission, deleteMultipleWithdrawals); // 批量删除提款申请

// 单个提款申请路由处理
router
  .route('/:id')
  .get(protect, checkPermission, getWithdrawalById) // 获取单个提款申请详情
  .put(protect, checkPermission, updateWithdrawalStatus) // 更新提款状态（如：审核通过/拒绝）
  .delete(protect, checkPermission, deleteWithdrawal); // 删除单个提款申请

export default router;
