import express, { Router } from 'express';
import { getRecords, getRecordById } from '../controllers/recordController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 设置活动记录的路由。
router.route('/').get(protect, checkPermission, getRecords);

router.route('/:id').get(protect, checkPermission, getRecordById);

export default router;
