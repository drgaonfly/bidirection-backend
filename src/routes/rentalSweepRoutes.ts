import express, { Router } from 'express';
import {
  getRentalSweeps,
  getRentalSweepById,
  addRentalSweep,
  updateRentalSweep,
  deleteRentalSweep,
  deleteMultipleRentalSweeps,
} from '../controllers/rentalSweepController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getRentalSweeps)
  .post(protect, checkPermission, addRentalSweep)
  .delete(protect, checkPermission, deleteMultipleRentalSweeps);

router
  .route('/:id')
  .get(protect, checkPermission, getRentalSweepById)
  .put(protect, checkPermission, updateRentalSweep)
  .delete(protect, checkPermission, deleteRentalSweep);

export default router;
