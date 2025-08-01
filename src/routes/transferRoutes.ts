import express, { Router } from 'express';
import {
  getTransfers,
  addTransfer,
  updateTransfer,
  deleteTransfer,
  deleteMultipleTransfers,
} from '../controllers/transferController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTransfers)
  .post(protect, checkPermission, addTransfer)
  .delete(protect, checkPermission, deleteMultipleTransfers);

router
  .route('/:id')
  .put(protect, checkPermission, updateTransfer)
  .delete(protect, checkPermission, deleteTransfer);

export default router;
