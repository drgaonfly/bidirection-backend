import express, { Router } from 'express';
import {
  getCustomers,
  deleteMultipleCustomers,
  addCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  verifyCustomer,
  getCustomerWalletByInviteCode,
} from '../controllers/customerController';
import { protect, checkPermission } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/verify').post(customerProtect, verifyCustomer);

// 获取用户归集返回代理钱包信息
router
  .route('/wallet')
  .post(protect, checkPermission, getCustomerWalletByInviteCode);

router
  .route('/')
  .get(protect, checkPermission, getCustomers)
  .delete(protect, checkPermission, deleteMultipleCustomers)
  .post(addCustomer);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteCustomer)
  .get(protect, checkPermission, getCustomerById)
  .put(protect, checkPermission, updateCustomer);

export default router;
