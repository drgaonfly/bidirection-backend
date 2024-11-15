import express, { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  deleteMultipleCustomers,
} from '../controllers/customerController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取所有用户、添加新用户和批量删除用户
router
  .route('/')
  .get(protect, checkPermission, getCustomers)
  .post(protect, checkPermission, addCustomer)
  .delete(protect, checkPermission, deleteMultipleCustomers);

// 根据 ID 获取、更新和删除用户
router
  .route('/:id')
  .get(protect, checkPermission, getCustomerById)
  .put(protect, checkPermission, updateCustomer)
  .delete(protect, checkPermission, deleteCustomer);

export default router;
