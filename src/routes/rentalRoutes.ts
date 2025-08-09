import express, { Router } from 'express';
import {
  getRentals,
  getRentalById,
  addRental,
  updateRental,
  deleteRental,
  deleteMultipleRentals,
  unRental,
} from '../controllers/rentalController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id/recycling').put(protect, checkPermission, unRental);

router
  .route('/')
  .get(protect, checkPermission, getRentals)
  .post(protect, checkPermission, addRental)
  .delete(protect, checkPermission, deleteMultipleRentals);

router
  .route('/:id')
  .get(protect, checkPermission, getRentalById)
  .put(protect, checkPermission, updateRental)
  .delete(protect, checkPermission, deleteRental);

export default router;
