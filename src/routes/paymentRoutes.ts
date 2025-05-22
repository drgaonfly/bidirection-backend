import express, { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  addPayment,
  updatePayment,
  deletePayment,
  deleteMultiplePayments,
} from '../controllers/paymentController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getPayments)
  .post(protect, checkPermission, addPayment)
  .delete(protect, checkPermission, deleteMultiplePayments);

router
  .route('/:id')
  .get(protect, checkPermission, getPaymentById)
  .put(protect, checkPermission, updatePayment)
  .delete(protect, checkPermission, deletePayment);

export default router;
