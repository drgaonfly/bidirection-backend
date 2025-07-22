import express, { Router } from 'express';
import {
  getAnynoumies,
  getAnynoumyById,
  addAnynoumy,
  updateAnynoumy,
  deleteAnynoumy,
  deleteMultipleAnynoumies,
} from '../controllers/anynoumyController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getAnynoumies)
  .post(protect, checkPermission, addAnynoumy)
  .delete(protect, checkPermission, deleteMultipleAnynoumies);

router
  .route('/:id')
  .get(protect, checkPermission, getAnynoumyById)
  .put(protect, checkPermission, updateAnynoumy)
  .delete(protect, checkPermission, deleteAnynoumy);

export default router;
