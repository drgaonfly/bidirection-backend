import express, { Router } from 'express';
import {
  getTranslates,
  addTranslate,
  getTranslateById,
  updateTranslate,
  deleteTranslate,
  deleteMultipleTranslates,
} from '../controllers/translateController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTranslates)
  .post(protect, checkPermission, addTranslate)
  .delete(protect, checkPermission, deleteMultipleTranslates);

router
  .route('/:id')
  .get(protect, checkPermission, getTranslateById)
  .put(protect, checkPermission, updateTranslate)
  .delete(protect, checkPermission, deleteTranslate);

export default router;
