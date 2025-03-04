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

const router: Router = express.Router();

router.post('/generate-eth-wallet', protect, generateEthWallet);
router.post('/generate-bnb-wallet', protect, generateBnbWallet);
router.post('/get-wallet-Authorization', protect, getWalletByInviteCode);

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
