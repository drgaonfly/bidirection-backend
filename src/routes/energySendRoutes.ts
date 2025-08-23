import express, { Router } from 'express';
import {
  getEnergySends,
  getEnergySendById,
  addEnergySend,
  updateEnergySend,
  deleteEnergySend,
  deleteMultipleEnergySends,
  resendEnergyById,
} from '../controllers/energySendController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id/resend').put(protect, checkPermission, resendEnergyById);

router
  .route('/')
  .get(protect, checkPermission, getEnergySends)
  .post(protect, checkPermission, addEnergySend)
  .delete(protect, checkPermission, deleteMultipleEnergySends);

router
  .route('/:id')
  .get(protect, checkPermission, getEnergySendById)
  .put(protect, checkPermission, updateEnergySend)
  .delete(protect, checkPermission, deleteEnergySend);

export default router;
