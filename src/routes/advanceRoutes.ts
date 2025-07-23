import express, { Router } from 'express';
import {
  getAdvances,
  getAdvanceById,
  addAdvance,
  updateAdvance,
  deleteAdvance,
  deleteMultipleAdvances,
} from '../controllers/advanceController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getAdvances)
  .post(protect, checkPermission, addAdvance)
  .delete(protect, checkPermission, deleteMultipleAdvances);

router
  .route('/:id')
  .get(protect, checkPermission, getAdvanceById)
  .put(protect, checkPermission, updateAdvance)
  .delete(protect, checkPermission, deleteAdvance);

export default router;
