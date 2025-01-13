import express, { Router } from 'express';
import {
  getLangues,
  getLangueById,
  addLangue,
  updateLangue,
  deleteLangue,
  deleteMultipleLangues,
} from '../controllers/langueController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getLangues)
  .post(protect, checkPermission, addLangue)
  .delete(protect, checkPermission, deleteMultipleLangues);

router
  .route('/:id')
  .get(getLangueById)
  .put(protect, checkPermission, updateLangue)
  .delete(protect, checkPermission, deleteLangue);

export default router;
