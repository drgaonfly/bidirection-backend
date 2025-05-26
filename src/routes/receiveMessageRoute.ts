import express, { Router } from 'express';
import { receiveMessage } from '../controllers/receiverController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/').post(protect, checkPermission, receiveMessage);

export default router;
