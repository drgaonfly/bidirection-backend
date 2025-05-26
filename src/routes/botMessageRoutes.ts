import express, { Router } from 'express';
import {
  getBotMessages,
  getBotMessageById,
} from '../controllers/botMessageController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/').get(protect, checkPermission, getBotMessages);

router.route('/:id').get(protect, checkPermission, getBotMessageById);

export default router;
