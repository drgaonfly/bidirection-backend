import express, { Router } from 'express';
import {
  getCustomers,
  deleteMultipleCustomers,
  addCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getCustomers)
  .delete(protect, checkPermission, deleteMultipleCustomers)
  .post(protect, checkPermission, addCustomer);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteCustomer)
  .get(protect, checkPermission, getCustomerById)
  .put(protect, checkPermission, updateCustomer);

export default router;
