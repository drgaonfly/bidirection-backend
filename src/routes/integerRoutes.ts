import express, { Router } from 'express';
import {
  getIntegers,
  getIntegerById,
  addInteger,
  updateInteger,
  deleteInteger,
  deleteMultipleIntegers,
} from '../controllers/integerController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getIntegers)
  .post(protect, checkPermission, addInteger)
  .delete(protect, checkPermission, deleteMultipleIntegers);

router
  .route('/:id')
  .get(protect, checkPermission, getIntegerById)
  .put(protect, checkPermission, updateInteger)
  .delete(protect, checkPermission, deleteInteger);

export default router;
