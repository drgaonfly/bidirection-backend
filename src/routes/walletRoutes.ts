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
  getWalletByInviteCode,
} from '../controllers/walletController';
import { protect, checkPermission } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.post('/generate-eth-wallet', protect, generateEthWallet);
router.post('/generate-bnb-wallet', protect, generateBnbWallet);

// 获取授权钱包地址
router.post(
  '/get-wallet-Authorization',
  customerProtect,
  getWalletByInviteCode,
);

router
  .route('/')
  .get(protect, checkPermission, getWallets)
  .post(addWallet)
  .delete(protect, checkPermission, deleteMultipleWallets);

router
  .route('/:id')
  .get(protect, checkPermission, getWalletById)
  .put(protect, checkPermission, updateWallet)
  .delete(protect, checkPermission, deleteWallet);

export default router;
