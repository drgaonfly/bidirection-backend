import express, { Router } from 'express';
import {
  getMemberOrderById,
  updateMemberOrder,
  deleteMemberOrder,
  getMemberOrders,
  deleteMultipleMemberOrders,
  createMemberOrder,
} from '../controllers/memberOrderController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getMemberOrders)
  .post(protect, checkPermission, createMemberOrder)
  .delete(protect, checkPermission, deleteMultipleMemberOrders);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteMemberOrder)
  .get(protect, checkPermission, getMemberOrderById)
  .put(protect, checkPermission, updateMemberOrder);

export default router;
