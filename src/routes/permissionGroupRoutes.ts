import express, { Router } from 'express';
import {
  getPermissionGroups,
  getPermissionGroupsList,
  getPermissionGroupById,
  addPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
  deleteMultiplePermissionGroups,
} from '../controllers/permissionGroupController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getPermissionGroups)

  .post(protect, checkPermission, addPermissionGroup)
  .delete(protect, checkPermission, deleteMultiplePermissionGroups);

router.route('/list').get(protect, getPermissionGroupsList);

router
  .route('/:id')
  .get(protect, checkPermission, getPermissionGroupById)
  .put(protect, checkPermission, updatePermissionGroup)
  .delete(protect, checkPermission, deletePermissionGroup);

export default router;
