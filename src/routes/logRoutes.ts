import express, { Router } from 'express';
import {
  getLogs,
  getLogById,
  addLog,
  updateLog,
  deleteLog,
  deleteMultipleLogs,
  cleanOldLogs,
} from '../controllers/logController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取所有日志、添加新日志和批量删除日志
router
  .route('/')
  .get(protect, checkPermission, getLogs)
  .post(protect, checkPermission, addLog)
  .delete(protect, checkPermission, deleteMultipleLogs);

// 清理旧日志
router.delete('/clean', protect, checkPermission, cleanOldLogs);

// 根据 ID 获取、更新和删除日志
router
  .route('/:id')
  .get(protect, checkPermission, getLogById)
  .put(protect, checkPermission, updateLog)
  .delete(protect, checkPermission, deleteLog);

export default router;
