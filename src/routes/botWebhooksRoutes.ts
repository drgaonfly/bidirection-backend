import express, { Router } from 'express';
import { handleBotWebhook } from '../controllers/botWebhookController';

const router: Router = express.Router();

router.route('/:id').post(handleBotWebhook);

export default router;
