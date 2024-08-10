import express, { Router } from 'express';
import {
  getPermissions,
  getPermissionById,
  addPermission,
  updatePermission,
  deletePermission,
  deleteMultiplePermissions,
} from '../controllers/permissionController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getPermissions, checkPermission)
  .post(protect, checkPermission, addPermission)
  .delete(protect, checkPermission, deleteMultiplePermissions);

router
  .route('/:id')
  .get(protect, checkPermission, getPermissionById)
  .put(protect, checkPermission, updatePermission)
  .delete(protect, checkPermission, deletePermission);

export default router;
