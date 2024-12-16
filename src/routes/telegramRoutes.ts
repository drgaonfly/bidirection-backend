// src/routes/telegramRoutes.ts
import express from 'express';
import { sendAuthCode, signIn } from '../controllers/telegramController';

const router = express.Router();

// Telegram 认证相关路由
router.post('/send-code', sendAuthCode);
router.post('/sign-in', signIn);

export default router;
