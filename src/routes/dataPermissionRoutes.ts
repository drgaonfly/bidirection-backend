import express, { Router } from 'express';
import {
  getDataPermissions,
  getDataPermissionById,
  addDataPermission,
  updateDataPermission,
  deleteDataPermission,
  deleteMultipleDataPermissions,
} from '../controllers/dataPermissionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getDataPermissions)
  .post(protect, checkPermission, addDataPermission)
  .delete(protect, checkPermission, deleteMultipleDataPermissions);

router
  .route('/:id')
  .get(protect, checkPermission, getDataPermissionById)
  .put(protect, checkPermission, updateDataPermission)
  .delete(protect, checkPermission, deleteDataPermission);

export default router;
