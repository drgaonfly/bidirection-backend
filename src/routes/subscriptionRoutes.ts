import express from 'express';
import {
  getSubscriptions,
  createSubscription,
} from '../controllers/subscriptionController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', protect, getSubscriptions);
router.post('/', protect, createSubscription);

export default router;
