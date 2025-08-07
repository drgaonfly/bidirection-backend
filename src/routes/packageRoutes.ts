import express, { Router } from 'express';
import {
  getPackages,
  getPackageById,
  addPackage,
  updatePackage,
  deletePackage,
  deleteMultiplePackages,
} from '../controllers/packageController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getPackages)
  .post(protect, checkPermission, addPackage)
  .delete(protect, checkPermission, deleteMultiplePackages);

router
  .route('/:id')
  .get(protect, checkPermission, getPackageById)
  .put(protect, checkPermission, updatePackage)
  .delete(protect, checkPermission, deletePackage);

export default router;
