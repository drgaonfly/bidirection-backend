import express, { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  addApplication,
  updateApplication,
  deleteApplication,
  deleteMultipleApplications,
} from '../controllers/applicationController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getApplications)
  .post(protect, checkPermission, addApplication)
  .delete(protect, checkPermission, deleteMultipleApplications);

router
  .route('/:id')
  .get(protect, checkPermission, getApplicationById)
  .put(protect, checkPermission, updateApplication)
  .delete(protect, checkPermission, deleteApplication);

export default router;
