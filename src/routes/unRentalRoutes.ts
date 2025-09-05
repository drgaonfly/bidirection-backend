import express, { Router } from 'express';
import {
  getUnRentals,
  getUnRentalById,
  addUnRental,
  updateUnRental,
  deleteUnRental,
  deleteMultipleUnRentals,
  reRecycle,
} from '../controllers/unRentalController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id/rerecycle').put(protect, checkPermission, reRecycle);

router
  .route('/')
  .get(protect, checkPermission, getUnRentals)
  .post(protect, checkPermission, addUnRental)
  .delete(protect, checkPermission, deleteMultipleUnRentals);

router
  .route('/:id')
  .get(protect, checkPermission, getUnRentalById)
  .put(protect, checkPermission, updateUnRental)
  .delete(protect, checkPermission, deleteUnRental);

export default router;
