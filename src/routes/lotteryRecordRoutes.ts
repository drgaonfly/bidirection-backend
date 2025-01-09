import express, { Router } from 'express';
import {
  getLotteryRecords,
  addLotteryRecord,
  getLotteryRecordById,
  updateLotteryRecord,
  deleteLotteryRecord,
  deleteMultipleLotteryRecords,
} from '../controllers/lotteryRecordController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置抽奖记录的路由
router
  .route('/')
  .get(protect, checkPermission, getLotteryRecords)
  .post(protect, checkPermission, addLotteryRecord)
  .delete(protect, checkPermission, deleteMultipleLotteryRecords);

router
  .route('/:id')
  .get(protect, checkPermission, getLotteryRecordById)
  .put(protect, checkPermission, updateLotteryRecord)
  .delete(protect, checkPermission, deleteLotteryRecord);

export default router;
