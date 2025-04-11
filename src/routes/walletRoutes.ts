import express, { Router } from 'express';
import {
  getWallets,
  addWallet,
  getWalletById,
  updateWallet,
  deleteWallet,
  deleteMultipleWallets,
  generateEthWallet,
  generateBnbWallet,
  getAuthorizationWallet,
  getCurrentUserWallet,
} from '../controllers/walletController';
import { protect, checkPermission } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取当前用户指定网络的钱包
router.get('/get-current-user-wallet', protect, getCurrentUserWallet);

router.post('/generate-eth-wallet', protect, generateEthWallet);
router.post('/generate-bnb-wallet', protect, generateBnbWallet);

// 获取授权钱包地址
router.get(
  '/get-authorization-wallet',
  customerProtect,
  getAuthorizationWallet,
);

router
  .route('/')
  .get(protect, checkPermission, getWallets)
  .post(protect, checkPermission, addWallet)
  .delete(protect, checkPermission, deleteMultipleWallets);

router
  .route('/:id')
  .get(protect, checkPermission, getWalletById)
  .put(protect, checkPermission, updateWallet)
  .delete(protect, checkPermission, deleteWallet);

export default router;
