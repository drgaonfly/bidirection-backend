import express, { Router } from 'express';
import { handleBotWebhook } from '../controllers/botWebhook';
import { protect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id').post(protect, handleBotWebhook);

export default router;
