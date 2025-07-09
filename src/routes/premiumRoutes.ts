import express, { Router } from 'express';
import {
  getPremiums,
  getPremiumById,
  addPremium,
  updatePremium,
  deletePremium,
  deleteMultiplePremiums,
} from '../controllers/premiumController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getPremiums)
  .post(protect, checkPermission, addPremium)
  .delete(protect, checkPermission, deleteMultiplePremiums);

router
  .route('/:id')
  .get(protect, checkPermission, getPremiumById)
  .put(protect, checkPermission, updatePremium)
  .delete(protect, checkPermission, deletePremium);

export default router;
