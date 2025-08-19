import express, { Router } from 'express';
import {
  getEnergyUsages,
  getEnergyUsageById,
  addEnergyUsage,
  updateEnergyUsage,
  deleteEnergyUsage,
  deleteMultipleEnergyUsages,
} from '../controllers/energyUsageController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getEnergyUsages)
  .post(protect, checkPermission, addEnergyUsage)
  .delete(protect, checkPermission, deleteMultipleEnergyUsages);

router
  .route('/:id')
  .get(protect, checkPermission, getEnergyUsageById)
  .put(protect, checkPermission, updateEnergyUsage)
  .delete(protect, checkPermission, deleteEnergyUsage);

export default router;
