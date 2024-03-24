import express, { Router } from 'express';
import { login, getUserProfile, updateUserProfile, refreshToken } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.post('/login', login);

router.post('/refresh', refreshToken);

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
